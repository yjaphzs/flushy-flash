import { create } from 'zustand';

type LikesState = {
  /**
   * Restroom ids the user has saved, keyed for O(1) lookup — the heart on a
   * restroom row asks this on every render, so an array scan would be the wrong
   * shape.
   */
  liked: Record<string, true>;
  /** Insertion order, newest first, as the Likes tab lists them. */
  order: string[];
  loading: boolean;
  error: string | null;
  setLiked: (restroomIds: string[]) => void;
  setError: (message: string | null) => void;
  reset: () => void;
};

export const useLikesStore = create<LikesState>((set) => ({
  liked: {},
  order: [],
  loading: true,
  error: null,
  setLiked: (restroomIds) =>
    set({
      liked: Object.fromEntries(restroomIds.map((id) => [id, true as const])),
      order: restroomIds,
      loading: false,
      error: null,
    }),
  setError: (error) => set({ error, loading: false }),
  // Signing out must empty this, or the next account would briefly inherit the
  // previous one's saved list.
  reset: () => set({ liked: {}, order: [], loading: false, error: null }),
}));

export const useLikedIds = () => useLikesStore((s) => s.order);
export const useIsLiked = (restroomId: string) =>
  useLikesStore((s) => s.liked[restroomId] === true);
export const useLikesLoading = () => useLikesStore((s) => s.loading);
