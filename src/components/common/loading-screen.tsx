import { useEffect } from 'react';

import { BrandMark } from '@/components/common/brand-mark';
import {
  Animated,
  FADE,
  SPRING,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from '@/components/ui/motion';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

/** The tagline, exactly as the brand artwork sets it. */
const TAGLINE = 'Don’t hold it — find it';

export type LoadingScreenProps = {
  /** Fades the whole screen out; the parent unmounts it when done. */
  leaving?: boolean;
  onFadedOut?: () => void;
  testID?: string;
};

/**
 * The cold-start screen: the mark, then the tagline, centred.
 *
 * It is a full-bleed absolute layer ABOVE the router rather than a replacement
 * for it. `_layout.tsx` used to `return null` while auth resolved, which meant
 * the app tree — and therefore AppProviders, and therefore uniwind's theme
 * context — did not exist yet, so nothing themed could be drawn. Rendering over
 * a mounted tree also lets the map warm up behind this.
 *
 * `--splash-ground` is mirrored by app.json's splash backgroundColor, so the
 * native splash hands over to this with no colour step.
 */
export function LoadingScreen({ leaving = false, onFadedOut, testID }: LoadingScreenProps) {
  const reduced = useReducedMotion();

  const markScale = useSharedValue(reduced ? 1 : 0.82);
  const markOpacity = useSharedValue(reduced ? 1 : 0);
  const taglineOpacity = useSharedValue(reduced ? 1 : 0);
  const taglineY = useSharedValue(reduced ? 0 : 10);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    markOpacity.set(withTiming(1, FADE));
    markScale.set(withSpring(1, SPRING));
    // The tagline follows rather than arriving together — the mark is the
    // subject, the line is the caption.
    taglineOpacity.set(withTiming(1, { duration: 320 }));
    taglineY.set(withSpring(0, SPRING));
  }, [reduced, markOpacity, markScale, taglineOpacity, taglineY]);

  useEffect(() => {
    if (!leaving) return;
    if (reduced) {
      onFadedOut?.();
      return;
    }
    // The callback fires from the UI thread, so it must be marshalled back.
    // withTiming's completion runs as a worklet; scheduling the unmount on a
    // timer of the same length keeps this file free of runOnJS plumbing for
    // what is a one-shot teardown.
    screenOpacity.set(withTiming(0, FADE));
    const id = setTimeout(() => onFadedOut?.(), FADE.duration);
    return () => clearTimeout(id);
  }, [leaving, reduced, screenOpacity, onFadedOut]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.get() }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.get(),
    transform: [{ scale: markScale.get() }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.get(),
    transform: [{ translateY: taglineY.get() }],
  }));

  return (
    <Animated.View
      style={[screenStyle, { position: 'absolute', inset: 0 }]}
      // `auto`, not box-none: this deliberately swallows taps on the tree
      // underneath while it is up.
      pointerEvents="auto"
    >
      <View className="flex-1 items-center justify-center gap-5 bg-splash-ground" testID={testID}>
        <Animated.View style={markStyle}>
          <BrandMark variant="bare" size={92} />
        </Animated.View>

        <Animated.View style={taglineStyle}>
          {/*
            The period is accent-coloured, as in the artwork. Split into its own
            Text so only the mark is tinted — the sentence itself stays
            foreground, at full contrast.
          */}
          <Text type="h4" weight="bold" className="tracking-tight">
            {TAGLINE}
            <Text type="h4" weight="bold" className="text-accent">
              .
            </Text>
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
