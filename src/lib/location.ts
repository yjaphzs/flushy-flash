import * as Location from 'expo-location';

import type { LatLng } from '@/lib/campus';

/** A location attempt, with the failure modes named rather than collapsed to null. */
export type Fix =
  | { kind: 'ok'; point: LatLng }
  | { kind: 'denied' }
  | { kind: 'unavailable' };

/** expo-location has no timeout option and indoor GPS can hang indefinitely. */
const TIMEOUT_MS = 8000;

/**
 * The last successful fix this session.
 *
 * Kept so surfaces that merely WANT a location — the distance tile on a
 * restroom sheet, say — can show one without triggering a permission dialog of
 * their own. Only `getCurrentFix` writes it, so nothing gains a location the
 * user did not already grant for something they asked for.
 */
let lastPoint: LatLng | null = null;

/** The last known fix, or null if none has succeeded yet. Never prompts. */
export function lastKnownPoint(): LatLng | null {
  return lastPoint;
}

/**
 * Permission plus a single fix, requested ON DEMAND.
 *
 * On demand is the point: asking at mount would fire a permission dialog just
 * because a tab bar rendered. This runs when someone actually presses "find the
 * nearest restroom", which is also the only moment the prompt makes sense.
 *
 * The three outcomes stay distinct because each deserves different copy —
 * collapsing them to `null` is what makes a feature fail silently.
 */
export async function getCurrentFix(): Promise<Fix> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { kind: 'denied' };

    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ]);
    if (!fix) return { kind: 'unavailable' };

    lastPoint = { lat: fix.coords.latitude, lng: fix.coords.longitude };
    return { kind: 'ok', point: lastPoint };
  } catch {
    return { kind: 'unavailable' };
  }
}
