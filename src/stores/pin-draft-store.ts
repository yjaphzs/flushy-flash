import { create } from 'zustand';

import type { LatLng } from '@/lib/campus';

/**
 * The pin being placed, between `/submit` and the full-screen placer.
 *
 * ## Why a store and not a route param
 *
 * There is no route-param return pattern in this app and `router.setParams` is
 * used nowhere. More to the point, `/submit` must NOT be unmounted while the
 * placer is open — it holds picked photos as local file URIs, and losing them
 * would make the user re-pick every one.
 *
 * ## Why a nonce rather than `auth-gate-store`'s `consume()`
 *
 * `consume()` mutates the store on read, and the consumer here runs during
 * RENDER. A store write in a render body is impure and misbehaves under
 * double-render and the React Compiler (`experiments.reactCompiler: true`).
 * A nonce keeps the read pure.
 *
 * It also buys what `map-focus-store`'s nonce buys: re-opening the placer and
 * confirming the SAME coordinate must still register, which an
 * equality-compared point would swallow.
 *
 * ## Why no `gateOpen` flag
 *
 * `auth-gate-store` needs one because its consumer fires on every auth
 * transition and must tell "finished" from "changed their mind". Here, backing
 * out simply never calls `commit()`, so the nonce does not move and the
 * consumer never fires. Backed-out is handled structurally.
 */
type PinDraftState = {
  /** Seeds the placer's camera, and is what `/submit` reads back. */
  point: LatLng | null;
  /** Bumped ONLY by commit(). Movement is what signals a confirmation. */
  nonce: number;
  commit: (point: LatLng) => void;
  /**
   * Positions the placer's camera without registering a confirmation.
   *
   * Editing needs this and creating does not: the placer seeds its camera from
   * `point`, so an edit must put the existing pin there — but `commit()` would
   * bump the nonce, and the form would read that as the user having just placed
   * a pin they never touched.
   */
  seed: (point: LatLng) => void;
  /** Cleared when the composer unmounts, so a later open starts fresh. */
  reset: () => void;
};

export const usePinDraftStore = create<PinDraftState>((set) => ({
  point: null,
  nonce: 0,
  commit: (point) => set((s) => ({ point, nonce: s.nonce + 1 })),
  seed: (point) => set({ point }),
  reset: () => set({ point: null, nonce: 0 }),
}));

export const usePinDraftPoint = () => usePinDraftStore((s) => s.point);
export const usePinDraftNonce = () => usePinDraftStore((s) => s.nonce);
