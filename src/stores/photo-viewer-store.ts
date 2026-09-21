import { create } from 'zustand';

type PhotoViewerState = {
  /** Every photo in the set being viewed, as Storage object paths. */
  paths: string[];
  /** Which one to open on. Not "which one is showing" — see below. */
  index: number;
  open: (paths: readonly string[], index: number) => void;
  close: () => void;
};

/**
 * What the full-screen photo viewer is showing.
 *
 * A store rather than route params for two reasons. The payload is an ARRAY,
 * which would have to be JSON-encoded into a query string and parsed back; and
 * the viewer is shared with REVIEW photos, which are not in `campus-store`, so
 * the route cannot look the set up from an id the way `/restroom/[id]` does.
 *
 * `map-focus-store.ts` makes the same argument for the same reason: this is a
 * one-shot message to a screen, not shared state that anything renders from.
 *
 * ⚠️ **`index` is the OPENING index, and the viewer must not write back to it.**
 * It seeds `initialScrollIndex` and nothing else. Making it track the visible
 * page would re-render every slide on each swipe, and the pager already owns
 * that number — see `photos.tsx`, which keeps the live page in screen state.
 *
 * Nothing persists. Re-opening a restroom and tapping a photo again is the
 * whole interaction; remembering where someone was last time is not a feature.
 */
export const usePhotoViewerStore = create<PhotoViewerState>((set) => ({
  paths: [],
  index: 0,

  open: (paths, index) =>
    set({
      paths: [...paths],
      // Clamped rather than trusted. A caller passing the index of a photo that
      // has since been removed would otherwise open a pager scrolled past its
      // own content, which renders blank with no error.
      index: Math.min(Math.max(index, 0), Math.max(paths.length - 1, 0)),
    }),

  // Cleared on close so a stale set cannot flash behind the next open. The
  // route reads `paths` during render, so leaving the old ones there would
  // paint the previous restroom's photos for a frame.
  close: () => set({ paths: [], index: 0 }),
}));

export const useViewerPaths = () => usePhotoViewerStore((s) => s.paths);
export const useViewerIndex = () => usePhotoViewerStore((s) => s.index);
