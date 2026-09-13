import { create } from 'zustand';

import { NO_FILTERS, type RestroomFilters } from '@/features/restrooms/filters';
import type { AmenityKey } from '@/features/restrooms/labels';
import type { GenderedAs } from '@/lib/types';

type MapFilterState = {
  query: string;
  filters: RestroomFilters;
  setQuery: (query: string) => void;
  toggleAmenity: (key: AmenityKey) => void;
  toggleAccess: (value: GenderedAs) => void;
  setOpenOnly: (on: boolean) => void;
  setVerifiedOnly: (on: boolean) => void;
  clearFilters: () => void;
  reset: () => void;
};

/**
 * What the map is currently showing.
 *
 * A store rather than screen state because two separate pieces of chrome drive
 * it — the search field and the filter sheet — and the sheet is presented over
 * the map rather than inside it. `map-focus-store.ts` is the template.
 *
 * ⚠️ The query and the filters clear SEPARATELY on purpose. "Clear filters" in
 * the sheet must not also wipe what somebody typed, and dismissing the search
 * field must not silently undo four toggles they set a minute ago. `reset()`
 * does both and is for signing out, not for a button.
 */
export const useMapFilterStore = create<MapFilterState>((set) => ({
  query: '',
  filters: NO_FILTERS,

  setQuery: (query) => set({ query }),

  toggleAmenity: (key) =>
    set((s) => ({
      filters: {
        ...s.filters,
        amenities: s.filters.amenities.includes(key)
          ? s.filters.amenities.filter((k) => k !== key)
          : [...s.filters.amenities, key],
      },
    })),

  toggleAccess: (value) =>
    set((s) => ({
      filters: {
        ...s.filters,
        access: s.filters.access.includes(value)
          ? s.filters.access.filter((v) => v !== value)
          : [...s.filters.access, value],
      },
    })),

  setOpenOnly: (openOnly) => set((s) => ({ filters: { ...s.filters, openOnly } })),
  setVerifiedOnly: (verifiedOnly) => set((s) => ({ filters: { ...s.filters, verifiedOnly } })),

  clearFilters: () => set({ filters: NO_FILTERS }),
  reset: () => set({ query: '', filters: NO_FILTERS }),
}));

export const useMapQuery = () => useMapFilterStore((s) => s.query);
export const useMapFilters = () => useMapFilterStore((s) => s.filters);
