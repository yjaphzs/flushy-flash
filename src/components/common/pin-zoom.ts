import type { MapBounds } from '@/components/common/map';

/**
 * How a restroom pin draws itself at the current zoom.
 *
 * `bubble-sm` is a 44px circle with a circular crop of the restroom's photo,
 * `bubble` the same shape at 60px, and `card` a rounded rectangle showing the
 * photo in full with a one-line caption. Three steps rather than two: with only
 * a circle and a card the change reads as a single flip rather than as the map
 * responding to zoom.
 */
export type PinShape = 'bubble-sm' | 'bubble' | 'card';

/**
 * Zoom thresholds, with a DEADBAND between each up and down crossing.
 *
 * The gap is the whole point. A camera parked exactly on a boundary jitters by
 * hundredths on every settle, and a single threshold would flap the shape — and
 * each flip is a full offscreen bitmap re-capture per pin, so flapping is
 * expensive as well as ugly.
 *
 * The campus opens at zoom 15.5 and MAX_ZOOM is 19 (`src/lib/campus.ts`), so
 * the app starts in `bubble-sm` and the card is a deliberate lean-in rather
 * than something a user lands on by default.
 */
const UP_TO_BUBBLE = 16.4;
const DOWN_TO_SMALL = 16.0;
const UP_TO_CARD = 17.9;
const DOWN_TO_BUBBLE = 17.5;

/**
 * The next shape, given the current zoom and the shape already showing.
 *
 * Pure and current-shape-dependent — that is what implements the hysteresis,
 * and it is why this is a function rather than a lookup on zoom alone.
 */
export function nextShape(zoom: number, current: PinShape): PinShape {
  if (current === 'card') return zoom < DOWN_TO_BUBBLE ? 'bubble' : 'card';
  if (current === 'bubble') {
    if (zoom >= UP_TO_CARD) return 'card';
    return zoom < DOWN_TO_SMALL ? 'bubble-sm' : 'bubble';
  }
  // bubble-sm
  if (zoom >= UP_TO_CARD) return 'card';
  return zoom >= UP_TO_BUBBLE ? 'bubble' : 'bubble-sm';
}

/**
 * Grows a viewport rectangle by a fraction of its own span on each axis.
 *
 * This padding IS the hysteresis for the viewport gate, exactly as the deadband
 * above is for the shape: without it a pin sitting on the screen edge would
 * mount and unmount on every pan settle, re-rasterising each time.
 */
export function padBounds(b: MapBounds, factor = 0.35): MapBounds {
  const dLng = (b.east - b.west) * factor;
  const dLat = (b.north - b.south) * factor;
  return {
    west: b.west - dLng,
    south: b.south - dLat,
    east: b.east + dLng,
    north: b.north + dLat,
  };
}

export function withinBounds(p: { lat: number; lng: number }, b: MapBounds): boolean {
  return p.lng >= b.west && p.lng <= b.east && p.lat >= b.south && p.lat <= b.north;
}

/**
 * Below this many pins, render every one and skip the viewport gate entirely.
 *
 * CLSU has zero restrooms today and will have a few hundred eventually, so this
 * escape hatch means the gate is inert at current data volumes — the map
 * behaves exactly as it did before this file existed until there is enough data
 * for culling to be worth its complexity.
 */
export const GATE_THRESHOLD = 60;

/**
 * Hard ceiling on simultaneously rendered pins.
 *
 * ⚠️ **This is a memory limit, not a performance nicety.** Every ViewAnnotation
 * on Android is rasterised to an ARGB_8888 bitmap at device density, so a 3x
 * screen turns a 140x114 `card` into roughly 574 KB. Three hundred of those is
 * ~172 MB and an OOM on a 2 GB phone. A `bubble-sm` is ~82 KB, which is why the
 * cap matters most at high zoom — where the viewport is also smallest, so it is
 * rarely reached in practice.
 */
export const MAX_PINS = 150;

/**
 * The pins worth rendering: inside the padded viewport, nearest the centre
 * first, capped.
 *
 * Sorting by distance from the centre means that when the cap does bite, what
 * survives is what the user is looking at rather than an arbitrary slice of
 * document order.
 */
export function visiblePins<T>(
  pins: T[],
  at: (pin: T) => { lat: number; lng: number },
  view: { bounds: MapBounds; center: { lat: number; lng: number } } | null,
): T[] {
  if (pins.length <= GATE_THRESHOLD || !view) return pins;

  const padded = padBounds(view.bounds);
  const inside = pins.filter((p) => withinBounds(at(p), padded));
  if (inside.length <= MAX_PINS) return inside;

  // Squared degrees, not metres: this only ever orders points against each
  // other, so haversine would buy precision nothing here consumes.
  const d2 = (p: T) => {
    const { lat, lng } = at(p);
    return (lat - view.center.lat) ** 2 + (lng - view.center.lng) ** 2;
  };
  return [...inside].sort((a, b) => d2(a) - d2(b)).slice(0, MAX_PINS);
}
