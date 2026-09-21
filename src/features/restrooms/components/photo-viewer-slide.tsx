import { useEffect } from 'react';

import { Gesture, GestureDetector } from '@/components/ui/gesture';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import {
  Animated,
  FADE,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from '@/components/ui/motion';
import { View } from '@/components/ui/view';
import { usePhotoUrl } from '@/features/restrooms/use-photo-url';

/** Past this the photo is bigger than any detail a 1600px source actually holds. */
const MAX_SCALE = 4;
/** Where a double-tap lands. Not MAX — a double-tap is "closer", not "as close as possible". */
const TAP_SCALE = 2.5;
/** Vertical travel that counts as "put it away" rather than a stray drag. */
const DISMISS_AT = 120;
/** How far a drag must go before it is a drag and not a tap. */
const SLOP = 15;

function clamp(v: number, lo: number, hi: number) {
  'worklet';
  return Math.min(Math.max(v, lo), hi);
}

export type PhotoViewerSlideProps = {
  path: string;
  width: number;
  height: number;
  /** False for every slide but the visible one, which is what resets zoom on paging. */
  isActive: boolean;
  /**
   * Owned by the pager, not by this slide.
   *
   * ⚠️ It has to live up there anyway — the pager needs it for `scrollEnabled`
   * — and keeping a local copy in step is exactly what the React Compiler lint
   * (`react-hooks/set-state-in-effect`) refuses: resetting that copy when the
   * slide goes inactive is a synchronous setState inside an effect. One owner,
   * passed down, has no such problem. Same lesson as `use-photo-url.ts`.
   */
  zoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
  onDismiss: () => void;
};

/**
 * One photo in the viewer: pinch, double-tap, pan, and drag-down to dismiss.
 *
 * ## ⚠️ Zoom and paging are the same gesture until you separate them
 *
 * A horizontal drag on a zoomed photo means "look left". The same drag on an
 * un-zoomed photo means "next photo". Nothing in the gesture itself tells them
 * apart, so this is resolved twice, in two places, and BOTH are required:
 *
 *  - **`activeOffsetX` is only applied while un-zoomed.** With it, a horizontal
 *    drag never activates this pan and the native pager underneath gets it.
 *    Without it — the zoomed case — this pan claims every direction, which is
 *    what makes panning around a magnified photo work at all.
 *  - **The pager sets `scrollEnabled={false}` while zoomed**, via
 *    `onZoomChange`. The gesture config above is not enough on its own: a
 *    native scroll view and a pan gesture both being willing to handle a drag
 *    is a race, and the loser is whichever the user notices.
 *
 * That is why zoom is BOTH a shared value and React state here. The worklet
 * needs the value; rebuilding the gesture with different offsets needs the
 * state. They are set together, from the same place.
 *
 * ## The reset on paging
 *
 * Swiping to the next photo and back must not return a photo still magnified
 * at whatever corner it was left in. `isActive` going false resets this
 * slide's shared values, which is also why the pager may keep every slide
 * mounted without them accumulating state.
 *
 * ⚠️ That effect writes SHARED VALUES only, never React state — see `zoomed`.
 */
export function PhotoViewerSlide({
  path,
  width,
  height,
  isActive,
  zoomed,
  onZoomChange,
  onDismiss,
}: PhotoViewerSlideProps) {
  const url = usePhotoUrl(path);
  const reduced = useReducedMotion();

  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  /*
    Written in an effect, never read from a prop inside a worklet — AGENTS.md
    §3: a worklet closing over a plain prop re-runs on change and produces a
    STEP, which looks exactly like no animation at all.
  */
  useEffect(() => {
    if (isActive) return;
    scale.set(1);
    x.set(0);
    y.set(0);
  }, [isActive, scale, x, y]);

  /** Keeps the photo's own edges from leaving the frame when magnified. */
  function settle() {
    'worklet';
    const s = scale.get();
    if (s <= 1) {
      scale.set(reduced ? 1 : withTiming(1, FADE));
      x.set(reduced ? 0 : withTiming(0, FADE));
      y.set(reduced ? 0 : withTiming(0, FADE));
      runOnJS(onZoomChange)(false);
      return;
    }
    const maxX = ((s - 1) * width) / 2;
    const maxY = ((s - 1) * height) / 2;
    x.set(clamp(x.get(), -maxX, maxX));
    y.set(clamp(y.get(), -maxY, maxY));
    runOnJS(onZoomChange)(true);
  }

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.set(scale.get());
    })
    .onUpdate((e) => {
      scale.set(clamp(startScale.get() * e.scale, 0.8, MAX_SCALE));
    })
    .onEnd(settle);

  let pan = Gesture.Pan().minPointers(1);
  // Un-zoomed, only a VERTICAL drag belongs to this slide; horizontal is the
  // pager's. Zoomed, every direction is ours — see the docblock.
  pan = zoomed ? pan : pan.activeOffsetY([-SLOP, SLOP]).failOffsetX([-SLOP, SLOP]);

  pan = pan
    .onStart(() => {
      startX.set(x.get());
      startY.set(y.get());
    })
    .onUpdate((e) => {
      if (scale.get() > 1) {
        x.set(startX.get() + e.translationX);
        y.set(startY.get() + e.translationY);
        return;
      }
      y.set(e.translationY);
    })
    .onEnd((e) => {
      if (scale.get() > 1) {
        settle();
        return;
      }
      if (Math.abs(e.translationY) > DISMISS_AT) {
        runOnJS(onDismiss)();
        return;
      }
      y.set(reduced ? 0 : withTiming(0, FADE));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const out = scale.get() > 1;
      scale.set(reduced ? (out ? 1 : TAP_SCALE) : withTiming(out ? 1 : TAP_SCALE, FADE));
      if (out) {
        x.set(reduced ? 0 : withTiming(0, FADE));
        y.set(reduced ? 0 : withTiming(0, FADE));
      }
      runOnJS(onZoomChange)(!out);
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height }} className="items-center justify-center">
        {url ? (
          <Animated.View style={style}>
            {/*
              ⚠️ allowDownscaling={false}. expo-image decodes to the size of the
              view by default, so a pinch to 4x would magnify a screen-sized
              decode rather than the photograph. See image.tsx.
            */}
            <Image
              source={{ uri: url }}
              style={{ width, height }}
              contentFit="contain"
              allowDownscaling={false}
              recyclingKey={path}
              accessibilityLabel="Photo"
            />
          </Animated.View>
        ) : (
          <Icon name="image" size={32} color="muted" />
        )}
      </View>
    </GestureDetector>
  );
}
