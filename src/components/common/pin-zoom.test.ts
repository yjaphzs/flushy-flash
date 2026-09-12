import {
  GATE_THRESHOLD,
  MAX_PINS,
  nextShape,
  padBounds,
  visiblePins,
  withinBounds,
  type PinShape,
} from '@/components/common/pin-zoom';

const bounds = { west: 120.92, south: 15.72, east: 120.95, north: 15.75 };
const centre = { lat: 15.735, lng: 120.935 };

describe('nextShape', () => {
  it('opens the campus in the small bubble', () => {
    // INITIAL_ZOOM is 15.5 — the app must not land on the expensive shape.
    expect(nextShape(15.5, 'bubble-sm')).toBe('bubble-sm');
  });

  it('steps up through all three shapes as the camera zooms in', () => {
    expect(nextShape(16.5, 'bubble-sm')).toBe('bubble');
    expect(nextShape(18.0, 'bubble')).toBe('card');
  });

  it('steps back down as it zooms out', () => {
    expect(nextShape(17.4, 'card')).toBe('bubble');
    expect(nextShape(15.9, 'bubble')).toBe('bubble-sm');
  });

  /**
   * The reason nextShape takes the current shape at all. Each flip is a full
   * offscreen bitmap re-capture per pin, so a camera resting on a boundary must
   * not oscillate.
   */
  it.each([
    ['bubble-sm', 16.2],
    ['bubble', 16.2],
    ['bubble', 17.7],
    ['card', 17.7],
  ] as [PinShape, number][])('holds %s inside the deadband at zoom %s', (shape, zoom) => {
    expect(nextShape(zoom, shape)).toBe(shape);
  });

  it('does not flap when zoom jitters across a threshold', () => {
    let shape: PinShape = 'bubble-sm';
    const seen = new Set<PinShape>();
    // Crossing up at 16.4 then drifting back to 16.1 must NOT drop back down;
    // the down-crossing is 16.0.
    for (const z of [16.39, 16.41, 16.2, 16.41, 16.1, 16.35]) {
      shape = nextShape(z, shape);
      seen.add(shape);
    }
    expect(shape).toBe('bubble');
    expect([...seen]).toEqual(['bubble-sm', 'bubble']);
  });

  it('jumps straight to card from the small bubble on a fast pinch', () => {
    // A quick pinch settles once; skipping the middle shape must be allowed.
    expect(nextShape(18.5, 'bubble-sm')).toBe('card');
  });
});

describe('padBounds', () => {
  it('grows the rectangle on both axes', () => {
    const p = padBounds(bounds, 0.5);
    expect(p.west).toBeCloseTo(120.905, 6);
    expect(p.east).toBeCloseTo(120.965, 6);
    expect(p.south).toBeCloseTo(15.705, 6);
    expect(p.north).toBeCloseTo(15.765, 6);
  });

  it('keeps a point just outside the viewport inside the padded one', () => {
    const justOutside = { lat: 15.7505, lng: 120.9505 };
    expect(withinBounds(justOutside, bounds)).toBe(false);
    expect(withinBounds(justOutside, padBounds(bounds))).toBe(true);
  });
});

describe('visiblePins', () => {
  const at = (p: { lat: number; lng: number }) => p;
  const make = (n: number, lat = 15.735, lng = 120.935) =>
    Array.from({ length: n }, () => ({ lat, lng }));

  it('is inert below the gate threshold, even far outside the viewport', () => {
    const far = make(GATE_THRESHOLD, 1, 1);
    expect(visiblePins(far, at, { bounds, center: centre })).toHaveLength(GATE_THRESHOLD);
  });

  it('returns everything when the map has never reported a viewport', () => {
    const pins = make(GATE_THRESHOLD + 10);
    expect(visiblePins(pins, at, null)).toHaveLength(GATE_THRESHOLD + 10);
  });

  it('culls pins outside the padded viewport once past the threshold', () => {
    const pins = [...make(GATE_THRESHOLD + 1), ...make(5, 1, 1)];
    expect(visiblePins(pins, at, { bounds, center: centre })).toHaveLength(GATE_THRESHOLD + 1);
  });

  it('caps at MAX_PINS and keeps the ones nearest the centre', () => {
    // One pin exactly on the centre, then many spread toward the edge.
    const near = { lat: centre.lat, lng: centre.lng };
    const spread = Array.from({ length: MAX_PINS + 50 }, (_, i) => ({
      lat: centre.lat + 0.0001 * (i + 1),
      lng: centre.lng,
    }));
    const out = visiblePins([...spread, near], at, { bounds, center: centre });
    expect(out).toHaveLength(MAX_PINS);
    expect(out[0]).toBe(near);
  });

  it('does not mutate the array it was given', () => {
    const pins = Array.from({ length: MAX_PINS + 10 }, (_, i) => ({
      lat: centre.lat + 0.0001 * i,
      lng: centre.lng,
    }));
    const snapshot = [...pins];
    visiblePins(pins, at, { bounds, center: centre });
    expect(pins).toEqual(snapshot);
  });
});
