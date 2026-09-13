import { useEffect } from 'react';

import { subscribeToBuildings } from '@/features/buildings/api';
import { subscribeToRestrooms } from '@/features/restrooms/api';
import { firestoreErrorMessage } from '@/lib/firestore-errors';
import { useUid } from '@/stores/auth-store';
import { useCampusStore } from '@/stores/campus-store';
import { useConnectionStore } from '@/stores/connection-store';

/** First automatic retry. Doubles per consecutive failure, capped at 30s. */
const RETRY_MS = 4000;
const MAX_RETRY_MS = 30_000;

/**
 * Two listeners for the entire app; every screen reads from the store rather
 * than opening its own query.
 *
 * Two defects this fixes, both of which were invisible while the whole app sat
 * behind a signed-in guard:
 *
 *  1. A `[]` dependency array. A Firestore onSnapshot that errors —
 *     permission-denied, an expired token, App Check — fires its error callback
 *     ONCE and then DETACHES PERMANENTLY. Nothing re-attached it. Stack.Protected
 *     used to remount the entire (app) subtree on sign-in, which quietly papered
 *     over that. Now that guests and signed-in users share one mounted tree, the
 *     same listener instance has to survive a guest→signed-in upgrade, and a
 *     dead one leaves a permanently empty map with no error and no spinner.
 *
 *  2. No auth dependency at all. Re-subscribing on `uid` is what re-reads the
 *     collections as the new principal, on both sign-in and sign-out.
 *
 * Public reads do NOT make (1) moot. Offline, quota exhaustion and any future
 * rules tightening reproduce it exactly; opening the rules only removed the most
 * likely trigger.
 *
 * It is also the app's only connectivity reporter. Both listeners pass
 * `snapshot.metadata.fromCache` to `connection-store`, which is what every
 * "you are offline" surface reads — see that file for why this is preferred to
 * a network module.
 */
export function useCampusData() {
  const uid = useUid();
  // Incremented by retry(), never reset — it is a re-subscribe key, not a
  // counter. The backoff counter is `failures`, which IS reset on success and is
  // deliberately not a dependency: resetting it must not tear down a working
  // listener.
  const attempt = useCampusStore((s) => s.attempt);

  useEffect(() => {
    const { setBuildings, setRestrooms, setError, reset } = useCampusStore.getState();
    reset();

    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Both listeners report, and either one proving a server round-trip is
    // enough to clear the offline state. They share one Firestore client, so
    // they flip together anyway — taking whichever speaks last is self-healing
    // rather than a race.
    const onMeta = (fromCache: boolean) => {
      if (live) useConnectionStore.getState().report(fromCache);
    };

    // By the time this runs the listener is already detached, so there is
    // nothing to unsubscribe — a fresh subscription is the only recovery.
    const fail = (e: unknown) => {
      if (!live) return;
      const { failures, retry } = useCampusStore.getState();
      setError(firestoreErrorMessage(e));
      const delay = Math.min(MAX_RETRY_MS, RETRY_MS * 2 ** Math.min(failures, 3));
      timer = setTimeout(() => {
        if (live) retry();
      }, delay);
    };

    const unsubBuildings = subscribeToBuildings(setBuildings, fail, onMeta);
    const unsubRestrooms = subscribeToRestrooms(setRestrooms, fail, onMeta);

    return () => {
      live = false;
      clearTimeout(timer);
      // Back to optimistic: a re-subscribe is about to re-establish the truth,
      // and leaving a stale "offline" up during it would be its own lie.
      useConnectionStore.getState().reset();
      unsubBuildings();
      unsubRestrooms();
    };
  }, [uid, attempt]);
}
