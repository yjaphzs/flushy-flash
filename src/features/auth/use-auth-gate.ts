import { useCallback, useEffect } from 'react';
import { router, type Href } from 'expo-router';

import { canWriteNow, useAuthStore, useCanWrite, type AuthStatus } from '@/stores/auth-store';
import { useAuthGateStore, type WriteIntent } from '@/stores/auth-gate-store';

/**
 * Where the gate opens for each unfinished state.
 *
 * A hint, not a contract — the stage guards in (auth)/_layout.tsx correct
 * a wrong guess on their own, because they decide which screen exists rather
 * than which one we navigated to.
 */
function gateEntry(status: AuthStatus): Href {
  if (status === 'needsVerification') return '/verify-email';
  if (status === 'needsProfile') return '/complete-profile';
  return '/join';
}

/**
 * The one thing every write surface calls, signed in or not.
 *
 * Signed in: goes straight where the user asked. Otherwise it remembers where
 * they were heading and opens the auth flow — so the button never looks dead
 * and never silently does nothing, which is what `submit.tsx` used to do.
 */
export function useRequestWrite() {
  return useCallback((intent: WriteIntent) => {
    if (canWriteNow()) {
      router.push(intent.href as Href);
      return;
    }
    useAuthGateStore.getState().request(intent);
    router.push(gateEntry(useAuthStore.getState().status));
  }, []);
}

/**
 * Resumes the interrupted intent once the account can write. Mount ONCE, in
 * (app)/_layout.tsx.
 *
 * This is the one deliberate `useEffect` + `router.push` in the codebase, and it
 * is NOT the thing AGENTS.md §8 bans. That rule is about a screen navigating as
 * a consequence of its own auth call — the guard owns that, and still does here.
 * This hook lives outside the tree being swapped, is triggered by a store
 * transition rather than by any `signIn()` call, and would fire identically if
 * the account were completed on another device. It continues navigation the user
 * started before the gate appeared; it does not redirect them.
 */
export function useAuthGateResume() {
  const canWrite = useCanWrite();
  const pending = useAuthGateStore((s) => s.pending);
  const gateOpen = useAuthGateStore((s) => s.gateOpen);

  useEffect(() => {
    if (!pending) return;
    const { consume, clear } = useAuthGateStore.getState();

    // Branch order is load-bearing. On success BOTH conditions change in the
    // same commit — the guard unmounts (auth), whose cleanup clears gateOpen —
    // and checking canWrite first is what stops the success path being mistaken
    // for a dismissal.
    if (canWrite) {
      const intent = consume();
      if (intent) router.push(intent.href as Href);
      return;
    }

    // The flow closed with the account still unfinished: they changed their
    // mind. Drop the intent rather than ambushing them with it later.
    if (!gateOpen) clear();
  }, [canWrite, gateOpen, pending]);
}
