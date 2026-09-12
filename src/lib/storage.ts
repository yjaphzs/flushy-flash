// Modular only. The FirebaseStorageTypes namespace is gone in v26, exactly as
// FirebaseAuthTypes / FirebaseFirestoreTypes are (AGENTS.md §4).
import { deleteObject, getDownloadURL, putFile, ref } from '@react-native-firebase/storage';

import { storage } from '@/lib/firebase';

/**
 * Photo upload, and the one place `storage.rules` is honoured.
 *
 * Three things in that file are contractual, and getting any of them wrong is a
 * flat `permission-denied` with no hint as to which:
 *
 *  1. **`metadata.uploadedBy` must equal the caller's uid.** `declaresUploader()`
 *     compares them on every create. It exists so a moderator can attribute an
 *     image without reading Firestore.
 *  2. **contentType must be `image/(jpeg|png|webp)`.** It is client-asserted and
 *     spoofable; the rules file notes that magic-byte checking is deferred to a
 *     Storage-triggered function, which needs Blaze.
 *  3. **Objects are immutable** — `allow update: if false`. Replacing bytes
 *     behind a live URL would let approved content be swapped after the fact, so
 *     "re-upload" means a new id.
 *
 * We store OBJECT PATHS on the restroom document, not download URLs: a URL is
 * long, carries a token, and would have to be re-fetched anyway if it were ever
 * revoked. `photoUrl()` resolves one on demand.
 */

/** 8 MB, matching `withinSizeLimit()` in storage.rules. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/**
 * Matches `isImage()` in storage.rules, and must match what photos.ts actually
 * encodes. The rules check the ASSERTED contentType, so a WebP body labelled
 * image/jpeg would pass the rule and then confuse every consumer — a lie that
 * happens to be accepted is the worst kind.
 */
const CONTENT_TYPE = 'image/webp';
const EXTENSION = 'webp';

/**
 * Object path for one restroom photo.
 *
 * The id is random rather than an index because objects are immutable and
 * deletes leave gaps — an index would collide with a previously-deleted photo.
 */
function photoPath(restroomId: string, index: number) {
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `restrooms/${restroomId}/${index}-${unique}.${EXTENSION}`;
}

export type UploadedPhoto = { path: string };

/**
 * Uploads one local file and returns its storage path.
 *
 * `putFile` takes a local filesystem URI, which is what the picker hands back —
 * no read into memory, so an 8 MB photo does not become an 8 MB JS string.
 */
export async function uploadRestroomPhoto(opts: {
  restroomId: string;
  uid: string;
  /** Local file URI from the picker, already resized. */
  uri: string;
  index: number;
}): Promise<UploadedPhoto> {
  const path = photoPath(opts.restroomId, opts.index);
  await putFile(ref(storage, path), opts.uri, {
    contentType: CONTENT_TYPE,
    // Not decoration — storage.rules refuses the write without it.
    customMetadata: { uploadedBy: opts.uid },
  });
  return { path };
}

/** Resolves a stored path to a URL the image layer can load. */
export function photoUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}

/**
 * Best-effort cleanup for photos whose document write then failed.
 *
 * Orphans are possible by construction: photos upload before the restroom
 * document exists, because the object path contains its id. Losing the race
 * leaves bytes nobody references — wasted, but harmless and invisible, which is
 * the right direction to fail. Never let cleanup failure mask the original
 * error.
 */
export async function deleteRestroomPhotos(paths: readonly string[]) {
  await Promise.allSettled(paths.map((path) => deleteObject(ref(storage, path))));
}
