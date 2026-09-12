import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import type { StyleSpecification } from '@maplibre/maplibre-react-native';

import { labelLayers } from '@/components/common/map-style/layers-labels';
import { landLayers } from '@/components/common/map-style/layers-land';
import { roadLayers } from '@/components/common/map-style/layers-roads';
import { DARK, LIGHT, type MapPalette } from '@/components/common/map-style/palette';

/**
 * A hand-authored MapLibre theme, replacing OpenFreeMap's stock `liberty` style.
 *
 * `Map`'s `mapStyle` prop is typed `string | StyleSpecification`, so a style
 * OBJECT is a first-class input — no hosted style to pay for, no API key, and
 * the colours can follow the app's theme. `StyleSpecification` comes from
 * `@maplibre/maplibre-gl-style-spec`, already a direct dependency of the RN
 * package and re-exported from its root, so this adds nothing to package.json.
 *
 * The tiles are still OpenFreeMap's: free, keyless, standard OpenMapTiles
 * schema. Only the styling is ours. `EXPO_PUBLIC_MAP_STYLE_URL` stays as the
 * documented escape hatch for pointing at MapTiler or Protomaps instead.
 */

/** Vector tiles. TileJSON, so MapLibre discovers zoom range and attribution. */
const TILES = 'https://tiles.openfreemap.org/planet';

/** Label glyphs. Only Noto Sans Regular/Bold/Italic exist here. */
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

/**
 * Declared but unused by our layers — nothing here draws an icon, because the
 * app supplies its own markers. Kept because a style with no `sprite` makes
 * MapLibre warn on every style load.
 */
const SPRITE = 'https://tiles.openfreemap.org/sprites/ofm_f384/ofm';

export function buildMapStyle(palette: MapPalette): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS,
    sprite: SPRITE,
    sources: {
      openmaptiles: { type: 'vector', url: TILES },
    },
    // Array order IS the z-stack: ground, then roads, then labels on top.
    layers: [...landLayers(palette), ...roadLayers(palette), ...labelLayers(palette)],
  };
}

export const LIGHT_MAP_STYLE = buildMapStyle(LIGHT);
export const DARK_MAP_STYLE = buildMapStyle(DARK);

/**
 * The style for the current colour scheme.
 *
 * `useColorScheme()` from react-native is the source because there is no in-app
 * theme toggle and heroui-native exports no `useTheme` — the OS is the only
 * authority the rest of the app answers to as well. **If a toggle is ever
 * added, this must move to the same store**, or the map will be the one surface
 * that disagrees with it.
 *
 * Memoised on the scheme, not rebuilt per render: changing `mapStyle` identity
 * makes MapLibre reload the whole style, which visibly re-draws the map.
 */
export function useMapStyle(): StyleSpecification {
  const scheme = useColorScheme();
  return useMemo(() => (scheme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE), [scheme]);
}
