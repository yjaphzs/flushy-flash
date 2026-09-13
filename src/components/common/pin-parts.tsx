import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { View } from '@/components/ui/view';

/**
 * The pieces every pin shape draws, split out when `restroom-pin-body.tsx`
 * reached the 200-line cap — which is the split that file's own docblock
 * predicted. It keeps the shared drawn parts here and the three SHAPES there.
 */

/**
 * The frame is TWO rings, and that is not decoration.
 *
 * A single white ring is invisible on the light map — which is most of campus —
 * so the pin dissolved into the background. A single accent ring sits straight
 * against the photo and reads as a coloured smudge on a dark image. Accent
 * outside for separation from the map, white inside to frame the photo, which
 * is the same reason a physical print gets a mount.
 *
 * Drawn as backgroundColor + padding rather than nested borderWidths: Android
 * rounds each border box independently and a 2px border inside another 2px
 * border leaves visible corner artefacts at these radii.
 */
export const FRAME_OUTER = 2;
export const FRAME_INNER = 2;
export const FRAME = FRAME_OUTER + FRAME_INNER;

/**
 * The community-confirmed tick, in the corner of the photo.
 *
 * ⚠️ **Absolutely positioned, and that is the whole design.** Out of flow means
 * the card's measured bounds cannot change, so the 140x114 geometry that
 * `pin-zoom.ts` derives MAX_PINS from is untouched BY CONSTRUCTION rather than
 * by careful measurement. It is also the only placement that works on the two
 * bubble shapes, which have no caption row at all.
 *
 * `check` rather than `badge-check`: that glyph is already the VERIFIED STUDENT
 * mark on `author-chip.tsx`, and a verified restroom is a different claim about
 * a different thing.
 *
 * Accent, not success-green. Every colour on this pin is the accent today, and
 * a second hue here would be the first — the tick carries the meaning, so the
 * fill does not have to (AGENTS.md §3).
 *
 * Absence means "not verified yet", which is a weaker convention than
 * `trust-row.tsx`'s explicit two-sided chips. Accepted deliberately: a pin is a
 * glance and has no room for the negative case.
 */
export function VerifiedBadge() {  return (
    <View
      className="absolute right-1 top-1 items-center justify-center rounded-full bg-accent"
      style={{ width: 16, height: 16, borderCurve: 'continuous' }}
    >
      <Icon name="check" size={11} color="on-accent" strokeWidth={3} />
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
export function Photo({  url,
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
export function Tail({ size, color }: { size: number; color: string }) {  return (
    <View
      style={{
        width: 0,
        height: 0,
        // Pulled up by a pixel: the tail and the frame are the same colour and
        // must read as one shape, and rounding can otherwise leave a hairline.
        marginTop: -1,
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

