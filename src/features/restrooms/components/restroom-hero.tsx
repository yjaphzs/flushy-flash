import { BrandGradient } from '@/components/common/gradient';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { usePhotoUrl } from '@/features/restrooms/use-photo-url';

export type RestroomHeroProps = {
  photoIds: readonly string[];
  /** Rendered over the image when there is no photo to look at. */
  title: string;
};

/** Tall enough to read as a photograph; short enough that the title is above the fold. */
const PHOTO_HEIGHT = 260;
/** The placeholder is shorter — there is nothing in it worth 260pt. */
const EMPTY_HEIGHT = 170;

/**
 * The head of `/restroom/[id]`: the first photo, full-bleed.
 *
 * A restroom is a place you are deciding whether to walk to, and the single
 * most useful thing in that decision is what the entrance looks like. The page
 * used to open on a back chevron and a heading, with the photos — if it showed
 * them at all — somewhere below the fold.
 *
 * ## ⚠️ There are deliberately NO scrims over the photo
 *
 * There were, briefly — a dark gradient down the top third to protect the back
 * button and another along the bottom to soften the seam. On the first real
 * photo they met, they were a defect: at `h-28` and `h-20` they covered 192 of
 * the 260pt, and over a dark image the hero read as a letterboxed thumbnail
 * with black bands rather than a photograph.
 *
 * Neither was earning its place. The back button carries its own opaque disc,
 * which is what makes the glyph legible over anything — `pick-location.tsx` has
 * relied on exactly that over arbitrary map tiles, with no scrim, since it was
 * written. And the seam is a rounded card overlapping by 24pt, which is a shape,
 * not a contrast problem.
 *
 * If a future photo does defeat the disc, fix the disc — do not reach for a
 * scrim that dims every photo to protect one.
 *
 * ## Why only the first photo
 *
 * A paged carousel needs gesture handling that competes with the vertical list
 * this header lives in, and a lightbox is its own feature. The rest of the
 * photos stay in the `PhotoStrip` below, which already scrolls horizontally and
 * is shared with the review card — so the hero takes photo one and the strip
 * takes the remainder, with nothing shown twice.
 */
export function RestroomHero({ photoIds, title }: RestroomHeroProps) {
  const url = usePhotoUrl(photoIds[0]);

  if (photoIds.length === 0) {
    return (
      <View style={{ height: EMPTY_HEIGHT }} className="items-center justify-center">
        <BrandGradient variant="brand" />
        {/*
          `brand`, never `backdrop`. The anchor stop in `backdrop` exists solely
          to carry the auth header's white wordmark at 6.72:1 and is not part of
          the brand ramp — borrowing it for a decorative fill is the thing
          gradient.tsx's docblock asks callers not to do.

          Nothing here is text on the ramp: the glyph is `on-brand` at 20% and
          the title below sits on `--background`, which sidesteps the fact that
          neither white nor near-black clears AA on #008F6A.
        */}
        <Icon name="map-pin" size={56} color="on-brand" />
        <Text type="body-sm" className="text-on-brand opacity-90 pt-2">
          No photos yet
        </Text>
      </View>
    );
  }

  return (
    <View style={{ height: PHOTO_HEIGHT }} className="bg-surface-secondary">
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: '100%', height: PHOTO_HEIGHT }}
          contentFit="cover"
          accessibilityLabel={`Photo of ${title}`}
        />
      ) : null}

    </View>
  );
}
