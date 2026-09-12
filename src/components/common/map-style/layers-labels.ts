import type { LayerSpecification } from '@maplibre/maplibre-react-native';

import type { MapPalette } from '@/components/common/map-style/palette';

const SRC = 'openmaptiles';

/**
 * The only fontstacks OpenFreeMap serves are `Noto Sans Regular`, `Bold` and
 * `Italic` — verified against its glyph endpoint. Naming anything else (an
 * app font, a system stack) yields tiles with no labels at all and no error.
 */
const REGULAR = ['Noto Sans Regular'];
const BOLD = ['Noto Sans Bold'];

/** Halo, not a shadow. Keeps a label readable over a park or a building fill. */
const halo = (p: MapPalette) => ({
  'text-halo-color': p.labelHalo,
  'text-halo-width': 1.2,
});

/**
 * Labels, and this is where "minimal" is decided.
 *
 * The app draws its own markers for every building with a restroom — that is
 * the content. Map labels are orientation only, so this keeps place names, road
 * names and water, and drops POIs, house numbers, boundaries and aerodromes
 * entirely. A campus map cluttered with every shop name is a worse map.
 */
export function labelLayers(p: MapPalette): LayerSpecification[] {
  return [
    {
      id: 'water-name',
      type: 'symbol',
      source: SRC,
      'source-layer': 'water_name',
      minzoom: 14,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': REGULAR,
        'text-size': 11,
        'text-max-width': 6,
      },
      paint: { 'text-color': p.labelMuted, ...halo(p) },
    },

    {
      id: 'road-name',
      type: 'symbol',
      source: SRC,
      'source-layer': 'transportation_name',
      minzoom: 15,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': REGULAR,
        'text-size': 11,
        // Along the line, not horizontal — a horizontal road label at campus
        // zoom covers the road it names.
        'symbol-placement': 'line',
        'text-rotation-alignment': 'map',
        'text-letter-spacing': 0.02,
      },
      paint: { 'text-color': p.labelMuted, ...halo(p) },
    },

    {
      id: 'place',
      type: 'symbol',
      source: SRC,
      'source-layer': 'place',
      // Cities and countries are meaningless inside a bounded campus view.
      filter: [
        'in',
        ['get', 'class'],
        ['literal', ['suburb', 'neighbourhood', 'village', 'hamlet', 'town']],
      ],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': BOLD,
        'text-size': ['interpolate', ['linear'], ['zoom'], 12, 11, 16, 14],
        'text-max-width': 8,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.08,
      },
      paint: { 'text-color': p.label, ...halo(p) },
    },
  ];
}
