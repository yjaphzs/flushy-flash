import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

import { DARK_MAP_STYLE, LIGHT_MAP_STYLE, tilePackStyle } from '@/components/common/map-style';
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
    // Handed to OfflineManager.createPack as a style URL, where an invalid
    // style produces an empty download rather than an error.
    ['offline tile pack', tilePackStyle()],
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

/**
 * The offline pack's economics, pinned.
 *
 * MapLibre's offline downloader requests every glyph range of every fontstack a
 * style names — 256 ranges each, ~93 KB apiece on OpenFreeMap — while the whole
 * of CLSU is about four vector tiles, because the planet TileJSON caps at
 * `maxzoom: 14`. Putting `glyphs` back would turn a sub-megabyte download into
 * forty-odd megabytes of type, silently, with nothing else failing.
 */
describe('offline tile pack style', () => {
  it('names no fonts at all', () => {
    const style = tilePackStyle();
    expect(style.glyphs).toBeUndefined();
    expect(style.sprite).toBeUndefined();
    expect(style.layers.some((layer) => layer.type === 'symbol')).toBe(false);
  });

  it('keeps the vector source, and every layer that pulls tiles from it', () => {
    const style = tilePackStyle();
    expect(style.sources.openmaptiles).toEqual({
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    });
    expect(style.layers.length).toBeGreaterThan(0);
    for (const layer of style.layers) {
      if (layer.type === 'background') continue;
      expect(layer.source).toBe('openmaptiles');
    }
  });

  it('drops the symbol layers and nothing else', () => {
    const expected = LIGHT_MAP_STYLE.layers.filter((l) => l.type !== 'symbol').map((l) => l.id);
    expect(tilePackStyle().layers.map((l) => l.id)).toEqual(expected);
  });
});
