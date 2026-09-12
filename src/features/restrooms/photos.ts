import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Photos per restroom, and per review.
 *
 * Mirrored by `isValidPhotoIds()` in firestore.rules, which is the enforcing
 * copy — this one only stops the picker offering a seventh. There is no import
 * across that boundary, so the two move together by hand.
 *
 * Five rather than six is a storage decision: every object is world-readable
 * and permanent (storage.rules makes them immutable), so the ceiling is what
 * bounds the bucket.
 */
export const MAX_PHOTOS = 5;

/**
 * Longest edge, in pixels, after resizing.
 *
 * A modern phone camera produces 4000px JPEGs of 4–12 MB — over the 8 MB ceiling
 * in storage.rules often enough to matter, and pointless for a thumbnail on a
 * map pin. 1600px is generous for a full-screen view on a 3x display and lands
 * comfortably under 1 MB, so an upload finishes on campus wifi rather than
 * timing out.
 */
const MAX_EDGE = 1600;

/**
 * WebP at high quality, not JPEG.
 *
 * "Lossless" was the ask, and for a PHOTOGRAPH that pulls the wrong way: PNG is
 * genuinely lossless and lands a 1600px photo at 3-6 MB, against the 8 MB
 * ceiling in storage.rules and a campus wifi upload. WebP at 0.9 is *smaller*
 * than the JPEG this replaced and looks better at the same time, which is both
 * halves of the request rather than a compromise between them.
 *
 * Honest caveat: the resize above is itself lossy, so what is preserved is
 * "no further loss after the resize we deliberately do".
 */
const FORMAT = SaveFormat.WEBP;
const QUALITY = 0.9;

export type PickedPhoto = {
  /** Local file URI, already resized and re-encoded as WebP. */
  uri: string;
};

/**
 * Opens the library and returns resized copies.
 *
 * Library only, not the camera. Adding a restroom is something people do
 * standing in a corridor, often having taken the photo a moment earlier, and a
 * library pick works whether or not they did. The plugin still declares the
 * camera permission so a "take a photo" affordance can be added without a
 * second prebuild.
 *
 * Permission is requested by `launchImageLibraryAsync` itself on both platforms,
 * so there is no separate request step to keep in sync.
 */
export async function pickRestroomPhotos(remaining: number): Promise<PickedPhoto[]> {
  if (remaining <= 0) return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    // The picker's own editor is skipped: cropping a restroom entrance is not
    // something anyone wants to do one photo at a time, and it blocks multi-select.
    quality: 1,
    exif: false,
  });

  if (result.canceled) return [];
  return Promise.all(result.assets.slice(0, remaining).map(shrink));
}

/**
 * Resizes one asset and re-encodes it as WebP.
 *
 * Also the step that strips metadata: `exif: false` above asks the picker not to
 * hand it over, and re-encoding guarantees it — a photo taken at the restroom
 * carries the GPS coordinates of the person who took it, and these images are
 * world-readable by anyone with the link.
 */
async function shrink(asset: ImagePicker.ImagePickerAsset): Promise<PickedPhoto> {
  const longest = Math.max(asset.width, asset.height);
  const context = ImageManipulator.manipulate(asset.uri);

  if (longest > MAX_EDGE) {
    const scale = MAX_EDGE / longest;
    context.resize({
      width: Math.round(asset.width * scale),
      height: Math.round(asset.height * scale),
    });
  }

  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: FORMAT, compress: QUALITY });
  return { uri: saved.uri };
}
