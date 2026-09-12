import type { LayerSpecification } from '@maplibre/maplibre-react-native';

import type { MapPalette } from '@/components/common/map-style/palette';

const SRC = 'openmaptiles';

/**
 * Ground: background, greenery, campus, water, buildings.
 *
 * Drawn in this order and no other — MapLibre paints layers in array order, so
 * this list IS the z-stack. Water above greenery so a pond inside a park reads;
 * buildings above both so a building on grass is not tinted by it.
 *
 * Deliberately ABSENT: `boundary` (no administrative lines on a campus map),
 * `aeroway` / `aerodrome_label` (there is no airfield), and every `landuse`
 * class except school. Minimal means fewer layers, not paler ones.
 */
export function landLayers(p: MapPalette): LayerSpecification[] {
  return [
    { id: 'background', type: 'background', paint: { 'background-color': p.land } },

    {
      id: 'green',
      type: 'fill',
      source: SRC,
      'source-layer': 'landcover',
      filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'farmland', 'wetland']]],
      paint: { 'fill-color': p.green },
    },
    {
      id: 'park',
      type: 'fill',
      source: SRC,
      'source-layer': 'park',
      paint: { 'fill-color': p.green },
    },

    /**
     * The campus itself. CLSU is tagged `landuse=university`, which OpenMapTiles
     * folds into class `school` alongside actual schools — fine here, since the
     * camera is bounded to campus (CAMPUS_MAX_BOUNDS) and nothing else is in
     * frame. This is the one map colour derived from the brand.
     */
    {
      id: 'campus',
      type: 'fill',
      source: SRC,
      'source-layer': 'landuse',
      filter: ['==', ['get', 'class'], 'school'],
      paint: { 'fill-color': p.campus },
    },

    {
      id: 'water',
      type: 'fill',
      source: SRC,
      'source-layer': 'water',
      // Intermittent water is dry most of the year; drawing it solid overstates
      // it. Excluded rather than faded, to keep the layer count down.
      filter: ['!=', ['get', 'intermittent'], 1],
      paint: { 'fill-color': p.water },
    },
    {
      id: 'waterway',
      type: 'line',
      source: SRC,
      'source-layer': 'waterway',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': p.water,
        'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.6, 17, 3, 19, 5],
      },
    },

    /**
     * Flat fills, no outline and no extrusion. An outline at campus zoom turns a
     * dense block of buildings into a grid of boxes, and 3D extrusion fights the
     * building markers the app draws on top — which are the actual content.
     */
    {
      id: 'building',
      type: 'fill',
      source: SRC,
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        'fill-color': p.building,
        // Fades in rather than popping at z14.
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.5, 1],
      },
    },
  ];
}
