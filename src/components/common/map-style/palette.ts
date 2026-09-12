/**
 * The map's colours — a fourth hand-maintained copy of a palette, and the only
 * honest place for it.
 *
 * Almost nothing here is an app token. Water, roads, buildings and parks have no
 * equivalent in `global.css`, and forcing them through `--color-*` would invent
 * eight tokens with one consumer each. What IS shared is the campus tint, which
 * is deliberately derived from the brand rather than eyeballed.
 *
 * These are plain hex strings because a MapLibre style is JSON evaluated by the
 * native renderer: it never sees a CSS variable, and uniwind cannot reach it.
 * AGENTS.md §14's duplication table lists this file for that reason.
 */
export type MapPalette = {
  /** Everything with no more specific fill. */
  land: string;
  /** Oceans, lakes, ponds. */
  water: string;
  /** Parks, woods, grass — one green, deliberately. */
  green: string;
  /** University/school grounds. The one brand-derived colour on the map. */
  campus: string;
  building: string;
  /** Road surface, and the casing drawn under it. */
  road: string;
  roadCasing: string;
  /** Footpaths and tracks — the campus is full of them. */
  path: string;
  label: string;
  labelHalo: string;
  /** Minor labels: paths, small water. */
  labelMuted: string;
};

/**
 * Light. An off-white ground rather than pure white: at campus zoom the map is
 * mostly background, and #FFF makes the white roads disappear into it.
 */
export const LIGHT: MapPalette = {
  land: '#F6F8F7',
  water: '#D8EBE3',
  green: '#E7F1EA',
  // #00855E at ~6% over the land. Enough to read as "this is the campus"
  // without competing with the building markers drawn on top.
  campus: '#EDF4F0',
  building: '#E8ECEA',
  road: '#FFFFFF',
  roadCasing: '#E2E7E4',
  path: '#E4EAE7',
  label: '#4A5551',
  labelHalo: '#F6F8F7',
  labelMuted: '#7C8884',
};

/**
 * Dark. `land` is pinned at #14181A and **must not be lightened** — the floating
 * tab bar's active circle is measured against the translucent pill composited
 * over this colour, and it lands at 3.20:1 against WCAG 1.4.11's 3:1 floor.
 * A lighter ground pushes it under. See AGENTS.md §14.
 */
export const DARK: MapPalette = {
  land: '#14181A',
  water: '#101E22',
  green: '#16241D',
  campus: '#18211D',
  building: '#1C2123',
  road: '#262B2D',
  roadCasing: '#1A1F21',
  path: '#232829',
  label: '#9AA6A1',
  labelHalo: '#14181A',
  labelMuted: '#6F7B77',
};
