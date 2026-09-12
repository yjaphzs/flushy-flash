import { create } from 'zustand';

import type { UpdateOffer } from '@/features/updates/api';

/**
 * Where an update attempt has got to.
 *
 * `installing` is a deliberate half-truth: Android hands control to the package
 * installer and never tells us the outcome. It means "the installer has been
 * launched", which is as much as this app can ever know.
 */
export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'installing'
  | 'error';

/** "Not now" holds the prompt off for a day. */
const SNOOZE_MS = 24 * 60 * 60 * 1000;

type UpdateState = {
  phase: UpdatePhase;
  offer: UpdateOffer | null;
  /** 0–1 while downloading. */
  progress: number;
  error: string | null;
  /**
   * Whether the automatic prompt may show.
   *
   * Two separate brakes, and both are needed. `snoozedUntil` survives "Not now"
   * so the prompt is not the first thing a student sees every morning;
   * `promptedThisSession` stops a second prompt after they have already
   * dismissed the dialog once, which returning to the foreground would
   * otherwise re-trigger immediately.
   */
  snoozedUntil: number;
  promptedThisSession: boolean;
  /** True only for the manual "Check for updates" button, which reports failures. */
  manual: boolean;

  begin: (manual: boolean) => void;
  offerUpdate: (offer: UpdateOffer) => void;
  noUpdate: () => void;
  fail: (message: string) => void;
  startDownload: () => void;
  setProgress: (fraction: number) => void;
  installing: () => void;
  /** User chose "Not now" — closes the dialog and holds it off for a day. */
  snooze: () => void;
  /** Closes without snoozing, e.g. after an error is acknowledged. */
  dismiss: () => void;
};

export const useUpdateStore = create<UpdateState>((set) => ({
  phase: 'idle',
  offer: null,
  progress: 0,
  error: null,
  snoozedUntil: 0,
  promptedThisSession: false,
  manual: false,

  begin: (manual) => set({ phase: 'checking', error: null, manual }),
  offerUpdate: (offer) =>
    set({ phase: 'available', offer, error: null, progress: 0, promptedThisSession: true }),
  noUpdate: () => set({ phase: 'idle', offer: null, error: null }),
  fail: (error) => set({ phase: 'error', error }),
  startDownload: () => set({ phase: 'downloading', progress: 0, error: null }),
  setProgress: (progress) => set({ progress }),
  installing: () => set({ phase: 'installing', progress: 1 }),
  snooze: () => set({ phase: 'idle', snoozedUntil: Date.now() + SNOOZE_MS }),
  dismiss: () => set({ phase: 'idle', error: null }),
}));

export const useUpdatePhase = () => useUpdateStore((s) => s.phase);
export const useUpdateOffer = () => useUpdateStore((s) => s.offer);
export const useUpdateProgress = () => useUpdateStore((s) => s.progress);
export const useUpdateError = () => useUpdateStore((s) => s.error);

/** Whether the automatic prompt is allowed to open right now. */
export function mayPromptNow(): boolean {
  const s = useUpdateStore.getState();
  return !s.promptedThisSession && Date.now() >= s.snoozedUntil;
}
