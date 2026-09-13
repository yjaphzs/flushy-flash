import { Directory, File, Paths } from 'expo-file-system';

/**
 * The Storage path → download URL map, on disk.
 *
 * ⚠️ **Without this the app looks, offline, like a campus where nobody ever
 * uploaded a photo.** `use-photo-url.ts` memoises resolutions in memory only,
 * and expo-image caches image BYTES on disk keyed by URL — so after a cold
 * start with no connection the URL can never be obtained, the disk cache is
 * addressable but unreachable, and every pin and sheet falls back to its glyph
 * even though the pixels are sitting in local storage.
 *
 * No new dependency: `expo-file-system` is already here for the APK updater,
 * and the File API is synchronous (JSI, not a bridge round trip), so reading a
 * ~100 KB JSON file at module load costs nothing worth measuring.
 *
 * ## Why persisting a URL is safe
 *
 * A Firebase download URL carries a `token` from the object's metadata. It has
 * no expiry — it stops working only if the object is deleted or the token is
 * rotated, and neither can happen quietly here: `storage.rules` makes objects
 * immutable (`allow update: if false`), and `onRestroomDeleted` removes a
 * restroom's Storage prefix together with the document that names the paths. So
 * a path that has gone stale is also a path nothing asks for any more.
 *
 * That is the argument for not re-validating; it is NOT an argument that
 * entries are free. They are only ever added, so the file is capped and evicts
 * oldest-first — object insertion order, which is the order they were resolved.
 */

/** ~400 × ~230 bytes ≈ 90 KB. Well past the few hundred photos one campus has. */
const MAX_ENTRIES = 400;

/**
 * Coalesces the burst of resolutions a map full of pins produces into one
 * write. Nothing is lost if the app dies inside the window — the next launch
 * simply resolves those paths again, which is the pre-existing behaviour.
 */
const FLUSH_MS = 1500;

const FILE_NAME = 'photo-urls.json';

let entries: Record<string, string> | null = null;
let flush: ReturnType<typeof setTimeout> | undefined;

function file() {
  return new File(Paths.document, FILE_NAME);
}

/**
 * Every access is wrapped: a corrupt file, a missing directory or a platform
 * that refuses the read must degrade to "no cache", never to a crash on launch.
 * This is an optimisation, and an optimisation may not be load-bearing.
 */
function load(): Record<string, string> {
  if (entries) return entries;
  entries = {};
  try {
    const handle = file();
    if (handle.exists) {
      const parsed: unknown = JSON.parse(handle.textSync());
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [path, url] of Object.entries(parsed)) {
          if (typeof url === 'string') entries[path] = url;
        }
      }
    }
  } catch (e) {
    if (__DEV__) console.warn('[photo-cache] could not read', e);
  }
  return entries;
}

function write() {
  flush = undefined;
  try {
    const current = load();
    const keys = Object.keys(current);
    // Oldest-first, because Object.keys preserves insertion order for string
    // keys — the order they were first resolved in.
    for (const stale of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) {
      delete current[stale];
    }
    new Directory(Paths.document).create({ idempotent: true, intermediates: true });
    file().write(JSON.stringify(current));
  } catch (e) {
    if (__DEV__) console.warn('[photo-cache] could not write', e);
  }
}

/** Everything resolved on a previous run. Safe to call before any await. */
export function persistedUrls(): Record<string, string> {
  return { ...load() };
}

export function rememberUrl(path: string, url: string) {
  const current = load();
  if (current[path] === url) return;
  current[path] = url;
  if (flush === undefined) flush = setTimeout(write, FLUSH_MS);
}

/** Drops one entry. Called when a resolution the cache vouched for fails. */
export function forgetUrl(path: string) {
  const current = load();
  if (!(path in current)) return;
  delete current[path];
  if (flush === undefined) flush = setTimeout(write, FLUSH_MS);
}

/** Test seam. Nothing in the app calls this. */
export function resetPhotoUrlCache() {
  entries = null;
  clearTimeout(flush);
  flush = undefined;
}
