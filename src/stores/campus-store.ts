import { create } from 'zustand';

import type { Building, Restroom } from '@/lib/types';

type CampusState = {
  buildings: Building[];
  restrooms: Restroom[];
  /** True until BOTH listeners have delivered a first snapshot. */
  loading: boolean;
  error: string | null;
  loadedBuildings: boolean;
  loadedRestrooms: boolean;
  /** Re-subscribe key for use-campus-data. Monotonic. */
  attempt: number;
  /** Consecutive failures, for backoff. Reset by either success. */
  failures: number;
  setBuildings: (buildings: Building[]) => void;
  setRestrooms: (restrooms: Restroom[]) => void;
  setError: (message: string | null) => void;
  /** Back to "nothing has arrived yet", without blanking what is on screen. */
  reset: () => void;
  /** Ask use-campus-data for a fresh pair of listeners. */
  retry: () => void;
};

/**
 * The whole campus dataset, held in memory.
 *
 * Feasible only because the app is scoped to one university: ~103 buildings and
 * a few hundred restrooms. Filtering and proximity sorting happen here rather
 * than as Firestore queries, which is why the app needs no geo indexes.
 */
export const useCampusStore = create<CampusState>((set) => ({
  buildings: [],
  restrooms: [],
  loading: true,
  error: null,
  loadedBuildings: false,
  loadedRestrooms: false,
  attempt: 0,
  failures: 0,

  // `loading` needs BOTH listeners, not either. Buildings arrive first and are
  // the smaller collection, so clearing on the first snapshot showed a map with
  // building pins and no restroom counts as if that were the finished state.
  setBuildings: (buildings) =>
    set((s) => ({
      buildings,
      loadedBuildings: true,
      loading: !s.loadedRestrooms,
      error: null,
      failures: 0,
    })),
  setRestrooms: (restrooms) =>
    set((s) => ({
      restrooms,
      loadedRestrooms: true,
      loading: !s.loadedBuildings,
      error: null,
      failures: 0,
    })),

  setError: (error) => set((s) => ({ error, loading: false, failures: s.failures + 1 })),

  // Deliberately does NOT clear buildings/restrooms: a re-subscribe must not
  // blank a map the user is currently looking at.
  reset: () => set({ loading: true, error: null, loadedBuildings: false, loadedRestrooms: false }),

  retry: () => set((s) => ({ attempt: s.attempt + 1 })),
}));

export const useBuildings = () => useCampusStore((s) => s.buildings);
export const useRestrooms = () => useCampusStore((s) => s.restrooms);
export const useCampusLoading = () => useCampusStore((s) => s.loading);
export const useCampusError = () => useCampusStore((s) => s.error);
