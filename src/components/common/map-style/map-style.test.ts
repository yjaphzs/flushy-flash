import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from '@/components/common/map-style';
import { DARK, LIGHT } from '@/components/common/map-style/palette';

/**
 * The style is hand-authored JSON evaluated by the native renderer, and an
 * invalid layer does not throw — MapLibre logs and skips it. The failure mode is
 * a map that silently loses its roads, or renders blank. Nothing in typecheck
 * catches that: TypeScript checks the SHAPE of a layer, not whether an
 * expression is well-formed, whether a `source-layer` is named, or whether a
 * paint property belongs to that layer type.
 *
 * `validateStyleMin` is the same validator MapLibre GL JS runs, from the spec
 * package that already ships inside the RN module.
 */
describe('map style', () => {
  it.each([
    ['light', LIGHT_MAP_STYLE],
    ['dark', DARK_MAP_STYLE],
  ])('%s validates against the MapLibre style spec', (_name, style) => {
    const errors = validateStyleMin(style).map((e) => `${e.message} (${e.identifier ?? '—'})`);
    expect(errors).toEqual([]);
  });

  it('gives every layer a unique id', () => {
    const ids = LIGHT_MAP_STYLE.layers.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every vector layer at the declared source', () => {
    const declared = Object.keys(LIGHT_MAP_STYLE.sources);
    for (const layer of LIGHT_MAP_STYLE.layers) {
      if (layer.type === 'background') continue;
      expect(declared).toContain(layer.source);
      // A vector layer with no `source-layer` renders nothing, silently.
      expect(layer['source-layer']).toBeTruthy();
    }
  });

  it('keeps the two palettes structurally identical', () => {
    // A key present in one and missing in the other is `undefined` at runtime,
    // which MapLibre treats as "no colour" rather than as an error.
    expect(Object.keys(DARK).sort()).toEqual(Object.keys(LIGHT).sort());
  });

  /**
   * The dark ground is load-bearing beyond the map: the floating tab bar's
   * active circle is measured against the translucent pill composited over it,
   * and lands at 3.20:1 against WCAG 1.4.11's 3:1 floor. Lightening this colour
   * pushes the tab bar out of compliance — in a different file, with nothing to
   * connect the two. This test is that connection.
   */
  it('keeps the dark ground dark enough for the tab bar', () => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(DARK.land.slice(i, i + 2), 16) / 255);
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    expect(luminance).toBeLessThanOrEqual(0.014);
  });
});
