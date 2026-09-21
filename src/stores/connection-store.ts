import { create } from 'zustand';

/**
 * Whether what the app is showing is LIVE, or served from Firestore's disk
 * cache because there is no usable connection.
 *
 * ⚠️ **This is not a network API, and deliberately so.** Both obvious choices —
 * `@react-native-community/netinfo` and `expo-network` — are native modules, and
 * a native module cannot reach an installed user through `features/updates/`'s
 * APK self-updater: it forces a full rebuild and a fresh install. That is the
 * same constraint that keeps push notifications out (AGENTS.md §7).
 *
 * Firestore already answers the question for free. Every `onSnapshot` carries
 * `metadata.fromCache`, which is precisely "this data did not come from the
 * server" — a better signal than a radio state anyway, since a phone can be
 * attached to a captive-portal wifi that netinfo calls connected and Firestore
 * cannot reach.
 *
 * `use-campus-data.ts` is the only reporter. It subscribes with
 * `includeMetadataChanges: true`, which is what makes a snapshot fire on the
 * connection flip itself rather than only when a document changes.
 */

/**
 * How long `fromCache` must hold before the app calls itself offline.
 *
 * ⚠️ **Without this every cold start flashes the offline banner.** A fresh
 * listener serves the cache first and the server a moment later, so `fromCache`
 * is true for the first few hundred milliseconds of a perfectly healthy launch.
 * Going offline is therefore delayed; coming back is instant, because a
 * server-backed snapshot is proof and needs no corroboration.
 */
export const OFFLINE_GRACE_MS = 2000;

/** Every listener that reports. Each is tracked separately — see `report`. */
export type ConnectionSource = 'buildings' | 'restrooms';

type ConnectionState = {
  /** Optimistic: true until proven otherwise, never "unknown". */
  online: boolean;
  /** Called with `snapshot.metadata.fromCache` on every snapshot. */
  report: (source: ConnectionSource, fromCache: boolean) => void;
  /** Cancels a pending verdict and returns to optimistic. For teardown. */
  reset: () => void;
};

// Module-scoped rather than in the store: it is a pending decision, not state
// anything renders, and putting it in the store would make every subscriber
// re-render when the countdown starts rather than when it lands.
let pending: ReturnType<typeof setTimeout> | undefined;

/**
 * The last `fromCache` each listener reported.
 *
 * ⚠️ **This used to be one global flag, and that was a real bug** — an online
 * phone could get stuck showing "You're offline" with its writes blocked.
 * Both campus listeners called one `report(fromCache)`, so whichever spoke last
 * won: `restrooms` reporting a live snapshot set online, then `buildings`
 * reporting a cached one set offline, and with nothing further to deliver
 * nothing ever set it back. Caught on the emulator, where `buildings` is empty
 * and answers from cache every time while `restrooms` answers from the server.
 *
 * The comment that used to be here claimed taking whichever spoke last was
 * "self-healing rather than a race". It was exactly a race.
 */
let cached: Partial<Record<ConnectionSource, boolean>> = {};

const cancel = () => {
  clearTimeout(pending);
  pending = undefined;
};

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  online: true,

  report: (source, fromCache) => {
    cached[source] = fromCache;

    // ONE server-backed listener is proof of a connection. Requiring all of
    // them would let the quietest collection speak for the whole app.
    if (Object.values(cached).some((c) => c === false)) {
      cancel();
      if (!get().online) set({ online: true });
      return;
    }

    // Already offline, or already counting down. Re-arming the timer on every
    // cached snapshot would push the verdict out indefinitely.
    if (!get().online || pending !== undefined) return;
    pending = setTimeout(() => {
      pending = undefined;
      set({ online: false });
    }, OFFLINE_GRACE_MS);
  },

  reset: () => {
    cancel();
    cached = {};
    set({ online: true });
  },
}));

export const useIsOnline = () => useConnectionStore((s) => s.online);

/** Non-reactive read, for event handlers that must not subscribe to it. */
export const isOnline = () => useConnectionStore.getState().online;
