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
  /**
   * Monotonic re-subscribe key.
   *
   * ⚠️ A Firestore `onSnapshot` that errors fires its error callback ONCE and
   * then DETACHES PERMANENTLY — there is nothing left to wait for and nothing
   * to unsubscribe. Without a way to re-subscribe, one permission-denied or one
   * expired token left the saved list dead for the rest of the process, showing
   * an empty state that was a lie. `use-campus-data` has had this since the app
   * went guest-first; the likes listener did not.
   */
  attempt: number;
  setLiked: (restroomIds: string[]) => void;
  setError: (message: string | null) => void;
  /** Re-open the listener. The screen's error branch calls this. */
  retry: () => void;
  reset: () => void;
};

export const useLikesStore = create<LikesState>((set) => ({
  liked: {},
  order: [],
  loading: true,
  error: null,
  attempt: 0,
  setLiked: (restroomIds) =>
    set({
      liked: Object.fromEntries(restroomIds.map((id) => [id, true as const])),
      order: restroomIds,
      loading: false,
      error: null,
    }),
  setError: (error) => set({ error, loading: false }),
  // `loading` goes back to true so the screen shows a spinner rather than
  // holding the old error under a button that appears to have done nothing.
  retry: () => set((s) => ({ attempt: s.attempt + 1, error: null, loading: true })),
  // Signing out must empty this, or the next account would briefly inherit the
  // previous one's saved list.
  // `attempt` is deliberately NOT reset: it is a subscription key, not state
  // about the account, and rewinding it would make a re-subscribe a no-op.
  reset: () => set({ liked: {}, order: [], loading: false, error: null }),
}));

export const useLikedIds = () => useLikesStore((s) => s.order);
export const useIsLiked = (restroomId: string) =>
  useLikesStore((s) => s.liked[restroomId] === true);
export const useLikesLoading = () => useLikesStore((s) => s.loading);
export const useLikesError = () => useLikesStore((s) => s.error);
