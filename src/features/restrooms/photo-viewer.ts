import { router } from 'expo-router';

import { usePhotoViewerStore } from '@/stores/photo-viewer-store';

/**
 * Open the full-screen viewer on a set of photos.
 *
 * The seam between the store (pure state) and the route. It lives here rather
 * than as a store action because a store that navigates is a store you cannot
 * test without a router, and `photo-viewer-store.test.ts` should not need one.
 *
 * ⚠️ This is NOT the banned `useEffect` + `router.push` pattern from AGENTS.md
 * §8. That rule is about screens navigating as a consequence of an auth call,
 * where the guard is supposed to swap the tree. This is a plain event handler:
 * a person tapped a photograph, so a photograph opens.
 *
 * A no-op on an empty set, so a caller does not have to guard — an empty hero
 * is still a `Pressable` and tapping it should do nothing rather than push a
 * blank screen.
 */
export function openPhotos(paths: readonly string[], index: number) {
  if (paths.length === 0) return;
  usePhotoViewerStore.getState().open(paths, index);
  router.push('/photos');
}
