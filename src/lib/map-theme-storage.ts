import { Directory, File, Paths } from 'expo-file-system';

/**
 * The map's theme, on disk.
 *
 * ⚠️ **Read synchronously at module scope, and that is the whole reason this
 * file exists rather than an async hydrate.** `useMapStyle()` has to return
 * the right style on the FIRST frame: MapLibre reloads and visibly redraws the
 * entire map when `mapStyle`'s identity changes, so a theme that arrives one
 * tick late is a map that flashes light before going dark on every launch.
 *
 * No new dependency. `expo-file-system` is already here for the APK updater
 * and the photo-URL cache, and its File API is synchronous JSI rather than a
 * bridge round trip — reading twenty bytes at launch costs nothing. There is
 * no AsyncStorage or MMKV in this project and one enum does not justify one.
 *
 * `photo-url-cache.ts` is the template, minus the parts a single value does
 * not need: no eviction, and no write debounce, because changing a theme is a
 * deliberate act somebody performs once, not a burst.
 *
 * ⚠️ Unlike that cache, this one is NOT merely an optimisation — losing it
 * silently reverts a setting the user chose. It still degrades to the default
 * rather than throwing, because a map that follows the system theme is a
 * working map and a crash on launch is not.
 */

export const MAP_THEMES = ['system', 'light', 'dark'] as const;

export type MapTheme = (typeof MAP_THEMES)[number];

/** Today's behaviour, so an install that has never opened Settings is unchanged. */
export const DEFAULT_MAP_THEME: MapTheme = 'system';

const FILE_NAME = 'map-theme.json';

function isMapTheme(value: unknown): value is MapTheme {
  return typeof value === 'string' && (MAP_THEMES as readonly string[]).includes(value);
}

function file() {
  return new File(Paths.document, FILE_NAME);
}

/** Safe before any await, and safe on a device that has never stored one. */
export function loadMapTheme(): MapTheme {
  try {
    const handle = file();
    if (!handle.exists) return DEFAULT_MAP_THEME;
    const parsed: unknown = JSON.parse(handle.textSync());
    // Read defensively: the file is ours, but a half-written or hand-edited one
    // must not put an unknown string into a style lookup.
    if (parsed && typeof parsed === 'object' && 'theme' in parsed && isMapTheme(parsed.theme)) {
      return parsed.theme;
    }
  } catch (e) {
    if (__DEV__) console.warn('[map-theme] could not read', e);
  }
  return DEFAULT_MAP_THEME;
}

export function saveMapTheme(theme: MapTheme) {
  try {
    new Directory(Paths.document).create({ idempotent: true, intermediates: true });
    file().write(JSON.stringify({ theme }));
  } catch (e) {
    if (__DEV__) console.warn('[map-theme] could not write', e);
  }
}
