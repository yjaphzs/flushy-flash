import { create } from 'zustand';

/** Why a "find nearest" attempt ended. Each gets its own copy on the map. */
export type NearestOutcome =
  | 'idle'
  | 'locating'
  | 'found'
  | 'denied'
  | 'unavailable'
  | 'none'
  | 'campusLoading';

type MapFocusState = {
  /**
   * A camera command. `nonce` is monotonic so pressing the button twice from
   * the same spot re-fires — without it, an identical target would be a no-op
   * and the button would feel broken.
   */
  focus: { lat: number; lng: number; nonce: number } | null;
  outcome: NearestOutcome;
  /** e.g. "Administration Building · 120 m". */
  label: string | null;
  /**
   * Which search attempt is current.
   *
   * `getCurrentFix()` cannot be aborted — expo-location takes no abort signal —
   * so cancelling cannot stop the work, only disown the result. Every attempt
   * captures this value at `begin()` and checks it before writing; `cancel()`
   * bumps it, which makes an in-flight fix arriving afterwards a no-op instead
   * of reopening a dialog the user just dismissed.
   */
  attempt: number;
  begin: () => number;
  succeed: (attempt: number, to: { lat: number; lng: number }, label: string) => void;
  fail: (attempt: number, outcome: Exclude<NearestOutcome, 'idle' | 'locating' | 'found'>) => void;
  /** User dismissed the search. Disowns whatever is in flight. */
  cancel: () => void;
  /** Clears a settled message. Used by the auto-dismiss timer on the map. */
  dismiss: () => void;
};

/**
 * A one-shot command channel between the tab bar and the map.
 *
 * The centre button lives in a global bar; the camera lives on the map screen.
 * A store rather than a route param because a param survives back-navigation
 * and would re-fly the camera on every remount, and it would put a transient
 * camera command into deep-linkable URL state. Not a Context either — AGENTS.md
 * §8: state lives in stores.
 */
export const useMapFocusStore = create<MapFocusState>((set, get) => ({
  focus: null,
  outcome: 'idle',
  label: null,
  attempt: 0,

  begin: () => {
    const attempt = get().attempt + 1;
    set({ attempt, outcome: 'locating', label: null });
    return attempt;
  },

  succeed: (attempt, to, label) =>
    set((s) =>
      // A result from a cancelled or superseded attempt is dropped, not shown.
      s.attempt !== attempt
        ? s
        : {
            focus: { ...to, nonce: (s.focus?.nonce ?? 0) + 1 },
            outcome: 'found',
            label,
          },
    ),

  fail: (attempt, outcome) =>
    set((s) => (s.attempt !== attempt ? s : { outcome, label: null })),

  cancel: () => set((s) => ({ attempt: s.attempt + 1, outcome: 'idle', label: null })),

  dismiss: () => set({ outcome: 'idle', label: null }),
}));

export const useMapFocus = () => useMapFocusStore((s) => s.focus);
export const useNearestOutcome = () => useMapFocusStore((s) => s.outcome);
export const useNearestLabel = () => useMapFocusStore((s) => s.label);
