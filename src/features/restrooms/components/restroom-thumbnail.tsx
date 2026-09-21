import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { usePhotoUrl } from '@/features/restrooms/use-photo-url';

export type RestroomThumbnailProps = {
  /** A Storage object PATH from `restroom.photoIds`, not a download URL. */
  path: string | undefined;
  /** 88 in the map sheet's header, 72 in a list row. */
  size: number;
  /**
   * Opens the photo viewer. Optional, and it has to be.
   *
   * ⚠️ **`restroom-row.tsx` must never pass it.** There the tile sits inside a
   * row that is itself a `Pressable` navigating to the restroom, so a handler
   * here would swallow that tap on the one part of the row a thumb naturally
   * lands on — the picture. The map sheet's header is not pressable as a
   * whole, which is why it can.
   */
  onPress?: () => void;
};

/**
 * A restroom's first photo, as a fixed square.
 *
 * Deliberately **not** `PhotoStrip`. That is a 132pt horizontal list carrying
 * its own "PHOTOS" label and its own "No photos yet" row, and it is shared with
 * `/restroom/[id]` and the review card — so it cannot be shrunk for the callers
 * that want a single tile.
 *
 * The glyph fallback is not only for a restroom with no photos: `usePhotoUrl`
 * resolves a path over the network, so `url` is null for the first frame of
 * every row. A tile that collapsed to nothing meanwhile would make a list jump
 * as it loaded, which is why the box is sized by props rather than by content.
 *
 * ## Safe to call once per list row
 *
 * `usePhotoUrl` memoises by path process-wide and compares the resolved path
 * during RENDER rather than clearing in an effect — so a recycled row can never
 * flash the previous restroom's photo, and N rows cost at most N distinct
 * resolves however many times they re-render.
 */
export function RestroomThumbnail({ path, size, onPress }: RestroomThumbnailProps) {
  const url = usePhotoUrl(path);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? 'Photo. Opens all photos.' : undefined}
      className="items-center justify-center overflow-hidden rounded-2xl bg-surface-secondary"
      style={{ width: size, height: size, borderCurve: 'continuous' }}
    >
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <Icon name="image" size={Math.round(size / 3.5)} color="muted" />
      )}
    </Pressable>
  );
}
