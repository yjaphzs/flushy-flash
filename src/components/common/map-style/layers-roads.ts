import type { FilterSpecification, LayerSpecification } from '@maplibre/maplibre-react-native';

import type { MapPalette } from '@/components/common/map-style/palette';

const SRC = 'openmaptiles';

/**
 * Shared so a casing and its surface can never drift apart.
 *
 * The FilterSpecification annotation is required, not decoration: hoisted to a
 * bare `const`, these widen to `string[]` and stop matching the spec's tuple
 * types. Inline in a layer they would infer correctly, which is exactly why
 * this is easy to get wrong.
 */
const MAJOR: FilterSpecification = ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]];
const MINOR: FilterSpecification = ['in', ['get', 'class'], ['literal', ['tertiary', 'minor', 'service']]];
const PATH: FilterSpecification = ['in', ['get', 'class'], ['literal', ['path', 'track']]];

/**
 * Rounded caps and joins on EVERY line layer. This is the single thing that
 * makes the map read as soft and modern rather than technical — a butt cap
 * leaves a visible square notch at every junction and every tile seam, which is
 * exactly what the flat-design map styles look like and what Apple Maps does
 * not.
 */
const ROUND = { 'line-cap': 'round', 'line-join': 'round' } as const;

/**
 * Roads, as casing-under-fill pairs.
 *
 * Every road is drawn twice: a wider casing first, then a narrower surface on
 * top. That is what turns a mesh of overlapping strokes into continuous ribbons
 * with clean junctions — a single-stroke road network shows every crossing as a
 * seam. It doubles the layer count and is worth it.
 *
 * All casings are drawn before all surfaces, not paired per class, so a minor
 * road's casing never cuts across a major road's surface.
 */
export function roadLayers(p: MapPalette): LayerSpecification[] {
  return [
    {
      id: 'path',
      type: 'line',
      source: SRC,
      'source-layer': 'transportation',
      filter: PATH,
      minzoom: 15,
      layout: ROUND,
      paint: {
        'line-color': p.path,
        'line-width': ['interpolate', ['linear'], ['zoom'], 15, 0.8, 19, 3],
        // Dashed: a campus is full of footpaths, and solid ones at this weight
        // are indistinguishable from service roads.
        'line-dasharray': [2, 2],
      },
    },

    {
      id: 'road-minor-casing',
      type: 'line',
      source: SRC,
      'source-layer': 'transportation',
      filter: MINOR,
      minzoom: 13,
      layout: ROUND,
      paint: {
        'line-color': p.roadCasing,
        'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1.5, 16, 5, 19, 16],
      },
    },
    {
      id: 'road-major-casing',
      type: 'line',
      source: SRC,
      'source-layer': 'transportation',
      filter: MAJOR,
      layout: ROUND,
      paint: {
        'line-color': p.roadCasing,
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 9, 19, 26],
      },
    },

    {
      id: 'road-minor',
      type: 'line',
      source: SRC,
      'source-layer': 'transportation',
      filter: MINOR,
      minzoom: 13,
      layout: ROUND,
      paint: {
        'line-color': p.road,
        'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.5, 16, 3.5, 19, 13],
      },
    },
    {
      id: 'road-major',
      type: 'line',
      source: SRC,
      'source-layer': 'transportation',
      filter: MAJOR,
      layout: ROUND,
      paint: {
        'line-color': p.road,
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1, 16, 7, 19, 22],
      },
    },
  ];
}
