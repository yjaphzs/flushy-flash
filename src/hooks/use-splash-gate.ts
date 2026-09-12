import { useEffect, useState } from 'react';

import { useAuthHydrated } from '@/stores/auth-store';

/**
 * The loading screen needs a floor, because `hydrated` does not supply one.
 *
 * A signed-out cold start resolves `hydrated` **synchronously**, inside the very
 * first `onAuthStateChanged` callback, with no network round trip
 * (auth-store.ts). So gating the loading screen on `hydrated` alone shows it for
 * a frame or two and then rips it away — which reads as a flicker, not as a
 * brand moment, and is worse than showing nothing.
 *
 * A signed-in start additionally waits on one Firestore read, so the real range
 * is roughly 0ms to a second or so. This clamps the bottom of that range only:
 * a slow start is never made slower.
 */
const MINIMUM_MS = 900;

/** True while the loading screen should still be on top. */
export function useSplashGate(minimumMs: number = MINIMUM_MS): boolean {
  const hydrated = useAuthHydrated();
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setElapsed(true), minimumMs);
    return () => clearTimeout(id);
  }, [minimumMs]);

  return !(hydrated && elapsed);
}
