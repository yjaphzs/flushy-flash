import { useCSSVariable } from 'uniwind';

import type { PinShape } from '@/components/common/pin-zoom';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

/**
 * Pin geometry, per shape.
 *
 * `size` is the OUTER diameter including the ring, and 44 is a floor rather
 * than a taste: the annotation's hit target is the rendered symbol's bounds, so
 * a smaller pin is an undersized touch target (AGENTS.md §4).
 */
const BUBBLE = {
  'bubble-sm': { size: 44, tail: 8 },
  bubble: { size: 60, tail: 10 },
} as const;

const CARD = { width: 140, photo: 80, caption: 26, radius: 16, tail: 10 } as const;
const RING = 3;

export type PinBodyProps = {
  shape: PinShape;
  /** Resolved URL of the first photo, or null for the glyph fallback. */
  photoUrl: string | null;
  /** Caption for the card shape — the landmark, or the building name. */
  label: string;
  /** Whether this pin's sheet is currently open. */
  selected: boolean;
  /** Fires when the photo is genuinely on screen; drives the bitmap re-capture. */
  onPhotoDisplay: () => void;
};

/**
 * The drawn part of a restroom pin, in three sizes.
 *
 * Split from `restroom-pin.tsx` so that file stays purely the MapLibre
 * annotation boundary and this one is ordinary views — which is also what keeps
 * both under the 200-line cap.
 *
 * ## Why the ring colour is resolved to a value
 *
 * `useCSSVariable` rather than a `border-accent` class, for the same reason
 * `ui/icon.tsx` does it: the tail is a CSS-triangle built from border widths,
 * and its colour has to be the same resolved string as the ring's or the two
 * halves of the teardrop disagree. One source, passed to both.
 *
 * ## No drop shadow, deliberately
 *
 * Android rasterises these views with a software `draw()`, and `elevation` is
 * drawn by the PARENT's RenderNode — so it does not appear in the capture at
 * all. The ring does that job: it is what separates a night-time entrance shot
 * from the dark map underneath.
 */
export function PinBody({ shape, photoUrl, label, selected, onPhotoDisplay }: PinBodyProps) {
  const accent = useCSSVariable('--color-accent');
  const ring = selected && typeof accent === 'string' ? accent : '#FFFFFF';

  if (shape === 'card') {
    return (
      <View className="items-center">
        <View
          // `bg-background`, NOT `bg-surface`: --surface carries alpha (82% in
          // light) because the glass theme depends on it, and a translucent
          // caption strip would let map tiles bleed through the label. This is
          // the one place in the app where that token would be actively wrong.
          className="overflow-hidden bg-background"
          style={{
            width: CARD.width,
            borderRadius: CARD.radius,
            borderCurve: 'continuous',
            borderWidth: RING,
            borderColor: ring,
          }}
        >
          <Photo
            url={photoUrl}
            width={CARD.width - RING * 2}
            height={CARD.photo}
            glyph={28}
            onDisplay={onPhotoDisplay}
          />
          {/*
            Fixed height and one line. A wrapping caption changes the view's
            bounds, which changes the bitmap, which changes the anchor offset —
            so a two-line landmark would make the pin visibly taller than its
            neighbours for no gain.
          */}
          <View className="justify-center px-2" style={{ height: CARD.caption }}>
            <Text type="body-xs" weight="medium" numberOfLines={1}>
              {label}
            </Text>
          </View>
        </View>
        <Tail size={CARD.tail} color={ring} />
      </View>
    );
  }

  const { size, tail } = BUBBLE[shape];
  const inner = size - RING * 2;

  return (
    <View className="items-center">
      <View
        className="items-center justify-center overflow-hidden bg-accent"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderCurve: 'continuous',
          borderWidth: RING,
          borderColor: ring,
        }}
      >
        <Photo
          url={photoUrl}
          width={inner}
          height={inner}
          glyph={size > 50 ? 26 : 22}
          onDisplay={onPhotoDisplay}
        />
      </View>
      <Tail size={tail} color={ring} />
    </View>
  );
}

/**
 * The photo, or the glyph when there is none.
 *
 * `transition={0}` and `onDisplay` are both load-bearing on Android and must
 * stay together — see the docblock in `restroom-pin.tsx`. `onLoad` fires before
 * the drawable is attached and cannot work here.
 */
function Photo({
  url,
  width,
  height,
  glyph,
  onDisplay,
}: {
  url: string | null;
  width: number;
  height: number;
  glyph: number;
  onDisplay: () => void;
}) {
  if (!url) {
    return (
      <View className="items-center justify-center bg-accent" style={{ width, height }}>
        <Icon name="map-pin" size={glyph} color="on-accent" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={{ width, height }}
      contentFit="cover"
      transition={0}
      onDisplay={onDisplay}
      // Keyed on the PHOTO, not the restroom: a changed first photo would
      // otherwise reuse the recycled view and show the old image.
      recyclingKey={url}
    />
  );
}

/**
 * The teardrop's point, as a CSS triangle.
 *
 * Border widths rather than a rotated square: a rotation would need the shape
 * to overlap the body above it to hide its top corner, and the overlap differs
 * per pin size. A triangle is exact at every size and rasterises identically.
 */
function Tail({ size, color }: { size: number; color: string }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.7,
        borderRightWidth: size * 0.7,
        borderTopWidth: size,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: color,
      }}
    />
  );
}
