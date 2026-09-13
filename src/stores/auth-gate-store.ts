import { create } from 'zustand';

/** Why the gate opened. Drives the headline on the join screen. */
export type WriteReason = 'add' | 'review' | 'like' | 'confirm' | 'profile';

export type WriteIntent = {
  /** Where the user was heading before the gate interrupted them. */
  href: string;
  reason: WriteReason;
};

type AuthGateState = {
  pending: WriteIntent | null;
  /**
   * Whether the auth flow is currently on screen. Set true when the gate opens
   * and false when the (auth) group unmounts.
   *
   * This is what distinguishes "they finished signing in" from "they changed
   * their mind" — without it a dismissed gate would leave the intent lying
   * around, and signing in from somewhere else three screens later would
   * teleport the user into a composer they never asked for.
   */
  gateOpen: boolean;
  request: (intent: WriteIntent) => void;
  /** Take the intent to act on it. */
  consume: () => WriteIntent | null;
  clear: () => void;
  setGateOpen: (open: boolean) => void;
};

export const useAuthGateStore = create<AuthGateState>((set, get) => ({
  pending: null,
  gateOpen: false,
  request: (intent) => set({ pending: intent, gateOpen: true }),
  consume: () => {
    const { pending } = get();
    set({ pending: null, gateOpen: false });
    return pending;
  },
  clear: () => set({ pending: null, gateOpen: false }),
  setGateOpen: (gateOpen) => set({ gateOpen }),
}));

export const usePendingIntent = () => useAuthGateStore((s) => s.pending);
