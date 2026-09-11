import { create } from 'zustand';

import type { Building, Restroom } from '@/lib/types';

type CampusState = {
  buildings: Building[];
  restrooms: Restroom[];
  loading: boolean;
  error: string | null;
  setBuildings: (buildings: Building[]) => void;
  setRestrooms: (restrooms: Restroom[]) => void;
  setError: (message: string | null) => void;
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
  setBuildings: (buildings) => set({ buildings, loading: false }),
  setRestrooms: (restrooms) => set({ restrooms, loading: false }),
  setError: (error) => set({ error, loading: false }),
}));

export const useBuildings = () => useCampusStore((s) => s.buildings);
export const useRestrooms = () => useCampusStore((s) => s.restrooms);
export const useCampusLoading = () => useCampusStore((s) => s.loading);
export const useCampusError = () => useCampusStore((s) => s.error);
