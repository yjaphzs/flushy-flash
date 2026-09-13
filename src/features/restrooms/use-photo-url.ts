import { useEffect, useState } from 'react';

import { forgetUrl, persistedUrls, rememberUrl } from '@/lib/photo-url-cache';
import { photoUrl } from '@/lib/storage';

/**
 * Resolves one storage object path to a loadable URL.
 *
 * Paths are what the restroom document stores, because a download URL carries a
 * token and would go stale in the document. Resolving is a network call, so the
 * results are memoised process-wide: the same photo is asked for by the map pin,
 * the detail sheet and the full page, and re-fetching per mount would triple the
 * requests for one image.
 *
 * Cached forever rather than with a TTL. Storage objects here are immutable by
 * rule (`allow update: if false`), so a path's bytes can never change — only be
 * deleted, which invalidates the whole entry anyway.
 *
 * ⚠️ **The memo now SURVIVES the process, and that is what makes photos work
 * offline.** In memory alone it did not: expo-image caches image BYTES on disk
 * keyed by URL, so on a cold start with no connection the URL could never be
 * obtained and its own cache was addressable but unreachable — every photo in
 * the app fell back to a glyph while the pixels sat in local storage. See
 * `photo-url-cache.ts` for why a download URL is safe to keep.
 */
const cache = new Map<string, Promise<string>>(
  Object.entries(persistedUrls()).map(([path, url]) => [path, Promise.resolve(url)]),
);

function resolve(path: string): Promise<string> {
  const hit = cache.get(path);
  if (hit) return hit;
  const pending = photoUrl(path)
    .then((url) => {
      rememberUrl(path, url);
      return url;
    })
    // Failures are evicted so a transient offline error does not poison the
    // entry for the life of the process — or, now, past it.
    .catch((e: unknown) => {
      cache.delete(path);
      forgetUrl(path);
      throw e;
    });
  cache.set(path, pending);
  return pending;
}

export function usePhotoUrl(path: string | undefined): string | null {
  /**
   * The resolved entry is stored WITH the path it belongs to, and the answer is
   * derived during render rather than reset in an effect.
   *
   * Two reasons. `react-hooks/set-state-in-effect` rejects a synchronous
   * setState in an effect body under the React Compiler — and it is right to:
   * clearing on `path` change would render one frame of the OLD photo against
   * the NEW pin before the effect ran. Comparing the key makes a mismatch
   * impossible instead of merely brief.
   */
  const [entry, setEntry] = useState<{ path: string; url: string } | null>(null);

  useEffect(() => {
    if (!path) return;
    let live = true;
    resolve(path)
      .then((url) => {
        if (live) setEntry({ path, url });
      })
      .catch((e: unknown) => {
        // A missing photo is not worth a visible error: the pin falls back to
        // its glyph and the strip shows one fewer image.
        //
        // But swallowing it silently in DEV made three very different faults —
        // a bucket misconfiguration, emulator routing pointing at the wrong
        // host, and an object that genuinely does not exist — all look
        // identical to "this restroom has no photos yet". One line to tell them
        // apart; still nothing user-visible in production.
        if (__DEV__) console.warn('[photo] could not resolve', path, e);
      });
    return () => {
      live = false;
    };
  }, [path]);

  return path && entry?.path === path ? entry.url : null;
}
