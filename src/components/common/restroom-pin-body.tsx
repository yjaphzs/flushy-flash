import { useCSSVariable } from 'uniwind';

import type { PinShape } from '@/components/common/pin-zoom';
import type { PinRating } from '@/features/restrooms/rating';
import {
  FRAME,
  FRAME_INNER,
  FRAME_OUTER,
  Photo,
  Tail,
  VerifiedBadge,
} from '@/components/common/pin-parts';
import { Icon } from '@/components/ui/icon';
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

export type PinBodyProps = {
  shape: PinShape;
  /** Resolved URL of the first photo, or null for the glyph fallback. */
  photoUrl: string | null;
  /** Caption for the card shape — the landmark, or the building name. */
  label: string;
  /** Aggregate rating for the card shape, or null when nothing is reviewed yet. */
  rating: PinRating | null;
  /** Whether the community has confirmed it exists. */
  verified: boolean;
  status: { label: string; tone: 'danger' | 'warning' } | null;
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
export function PinBody({
  shape,
  photoUrl,
  label,
  rating,
  verified,
  status,
  selected,
  onPhotoDisplay,
}: PinBodyProps) {
  const resolved = useCSSVariable('--color-accent');
  /**
   * A fourth sRGB copy of --accent, and it is registered in AGENTS.md §14's
   * duplicated-colours table. It only appears if uniwind cannot resolve the
   * variable, which it reports as a __DEV__ warning and nothing else — so a
   * wrong value here would ship looking fine.
   */
  const accent = typeof resolved === 'string' ? resolved : '#00855E';
  // Selected fills the mount with the accent too, so the whole frame reads as
  // one solid colour rather than changing a ring nobody was looking at.
  const mount = selected ? accent : '#FFFFFF';

  if (shape === 'card') {
    const contentW = CARD.width - FRAME * 2;
    return (
      <View className="items-center">
        <View
          style={{
            backgroundColor: accent,
            padding: FRAME_OUTER,
            borderRadius: CARD.radius,
            borderCurve: 'continuous',
          }}
        >
          <View
            style={{
              backgroundColor: mount,
              padding: FRAME_INNER,
              borderRadius: CARD.radius - FRAME_OUTER,
              borderCurve: 'continuous',
            }}
          >
            <View
              className="overflow-hidden bg-background"
              style={{ borderRadius: CARD.radius - FRAME, borderCurve: 'continuous' }}
            >
              <View>
                <Photo
                  url={photoUrl}
                  width={contentW}
                  height={CARD.photo}
                  glyph={28}
                  onDisplay={onPhotoDisplay}
                />
                {verified ? <VerifiedBadge /> : null}
              </View>
              {/*
                Fixed height and one line. A wrapping caption changes the view's
                bounds, which changes the bitmap, which changes the anchor
                offset — so a two-line landmark would make the pin visibly
                taller than its neighbours for no gain.
              */}
              <View
                className="flex-row items-center gap-1 px-2"
                style={{ height: CARD.caption, width: contentW }}
              >
                <Text type="body-xs" weight="medium" numberOfLines={1} className="flex-1">
                  {label}
                </Text>
                {/*
                  ⚠️ Rides the EXISTING caption row rather than adding a line.
                  `pin-zoom.ts` derives MAX_PINS from ~574 KB per card bitmap at
                  this 140x114 geometry, so a second line would silently
                  invalidate that arithmetic along with the memory budget.

                  A numeral, not `stars.tsx`: five 14pt glyphs plus a label
                  cannot fit beside a landmark in 132pt, and a numeral also
                  satisfies §3's rule that a fill never carries meaning alone.
                */}
                {/*
                  ⚠️ **Status outranks the rating, and shares its slot.**
                  Whether a toilet WORKS beats how clean people found it, and
                  this row is the only space there is — a second line changes
                  the bitmap, the anchor offset and `MAX_PINS` at once (see
                  above). The landmark truncates instead, which is the right
                  thing to lose.

                  Words, not a tint: §3's rule that a fill never carries meaning
                  alone applies here more than anywhere, because the whole card
                  is rasterised and a colour-blind reader has nothing else.

                  This was invisible until the edit screen shipped — `status`
                  was pinned to 'ok' at create and settable by nothing, so a
                  broken toilet looked identical to a working one on the map.
                */}
                {status ? (
                  <Text
                    type="body-xs"
                    weight="medium"
                    numberOfLines={1}
                    className={status.tone === 'danger' ? 'text-danger' : 'text-warning'}
                  >
                    {status.label}
                  </Text>
                ) : rating ? (
                  <View className="flex-row items-center gap-0.5">
                    <Icon name="star" size={10} color="accent" filled />
                    <Text type="body-xs" weight="medium">
                      {rating.average.toFixed(1)}
                    </Text>
                    <Text type="body-xs" color="muted">
                      ·{rating.count}
                    </Text>
                  </View>
                ) : (
                  /*
                    Nothing has been reviewed yet. A "New" marker rather than a
                    blank or a zero: `score-bar.tsx` sets the rule that an empty
                    scale reads as a score of zero rather than as nobody having
                    spoken, and this space would otherwise read as a rating that
                    failed to load.
                  */
                  <Text type="body-xs" weight="medium" className="text-link">
                    New
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
        <Tail size={CARD.tail} color={accent} />
      </View>
    );
  }

  const { size, tail } = BUBBLE[shape];
  const photo = size - FRAME * 2;

  return (
    <View className="items-center">
      <View
        style={{
          backgroundColor: accent,
          padding: FRAME_OUTER,
          borderRadius: size / 2,
          borderCurve: 'continuous',
        }}
      >
        <View
          style={{
            backgroundColor: mount,
            padding: FRAME_INNER,
            borderRadius: (size - FRAME_OUTER * 2) / 2,
            borderCurve: 'continuous',
          }}
        >
          <View
            className="items-center justify-center overflow-hidden bg-accent"
            style={{ borderRadius: photo / 2, borderCurve: 'continuous' }}
          >
            <Photo
              url={photoUrl}
              width={photo}
              height={photo}
              glyph={size > 50 ? 24 : 20}
              onDisplay={onPhotoDisplay}
            />
            {verified ? <VerifiedBadge /> : null}
          </View>
        </View>
      </View>
      <Tail size={tail} color={accent} />
    </View>
  );
}
