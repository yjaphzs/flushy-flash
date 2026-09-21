import { create } from 'zustand';

import {
  DEFAULT_MAP_THEME,
  type MapTheme,
  loadMapTheme,
  saveMapTheme,
} from '@/lib/map-theme-storage';

type MapThemeState = {
  theme: MapTheme;
  setTheme: (theme: MapTheme) => void;
};

/**
 * Which map style the user picked.
 *
 * ⚠️ **Seeded synchronously from disk at module scope.** `useMapStyle()` is
 * called during the map's first render, and MapLibre reloads the whole style —
 * a visible redraw — when the object identity changes. Hydrating in an effect
 * would make every cold start flash the wrong theme for a frame.
 *
 * ⚠️ **This is the MAP's theme, not the app's.** App chrome still follows
 * `useColorScheme()`, so a dark map under a light app is a legitimate state
 * somebody chose, not a bug to reconcile. The Settings row is labelled "Map
 * theme" for exactly that reason. If an app-wide toggle ever lands, the map
 * should read it on `'system'` instead of `useColorScheme()` — and that is a
 * one-line change in `map-style/index.ts`, which is where it belongs.
 *
 * Writing straight through on `setTheme` rather than in an effect keeps the
 * store the single writer; there is no debounce because a person changes this
 * roughly never.
 */
export const useMapThemeStore = create<MapThemeState>((set) => ({
  theme: loadMapTheme(),

  setTheme: (theme) => {
    saveMapTheme(theme);
    set({ theme });
  },
}));

export const useMapTheme = () => useMapThemeStore((s) => s.theme);

export { DEFAULT_MAP_THEME, type MapTheme };
