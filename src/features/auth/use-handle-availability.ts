import { useEffect, useRef, useState } from 'react';

import { isHandleAvailable, isValidHandle, normalizeHandle } from '@/features/auth/api';

export type HandleState = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'error';

/** Long enough that ordinary typing never fires a read, short enough to feel live. */
const DEBOUNCE_MS = 400;

/**
 * Settled results, memoised for the life of the process. Backspace-and-retype is
 * free, which is most of the traffic a live check would otherwise generate.
 * Module-level on purpose: it should survive the component remounting when the
 * user moves between sign-up and the profile step.
 */
const cache: Record<string, boolean> = {};

/**
 * Debounced @handle availability.
 *
 * This is advisory only. The submit path still calls `isHandleAvailable` and the
 * real lock is the batched `handles/{handle}` write in `signUp`, guarded by
 * firestore.rules — a check here can always go stale between keystroke and
 * submit, so it must never be the thing standing between two users and the same
 * name.
 *
 * Everything except the network result is *derived during render* rather than
 * pushed into state from an effect: empty, malformed and already-cached handles
 * are all pure functions of the input, and setting state for them would cascade
 * a second render on every keystroke.
 */
export function useHandleAvailability(raw: string): { state: HandleState; normalized: string } {
  const normalized = normalizeHandle(raw);
  const [resolved, setResolved] = useState<{ handle: string; state: HandleState } | null>(null);
  // Guards against a slow response for an earlier handle landing after a newer
  // one and overwriting it.
  const requestId = useRef(0);

  let state: HandleState;
  if (normalized.length === 0) {
    state = 'idle';
  } else if (!isValidHandle(normalized)) {
    // Malformed handles never reach Firestore — that alone removes most reads.
    state = 'invalid';
  } else if (normalized in cache) {
    state = cache[normalized] ? 'available' : 'taken';
  } else if (resolved?.handle === normalized) {
    state = resolved.state;
  } else {
    state = 'checking';
  }

  const needsCheck = state === 'checking';

  useEffect(() => {
    if (!needsCheck) return;

    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const free = await isHandleAvailable(normalized);
        cache[normalized] = free;
        if (requestId.current === id) {
          setResolved({ handle: normalized, state: free ? 'available' : 'taken' });
        }
      } catch {
        if (requestId.current === id) setResolved({ handle: normalized, state: 'error' });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [needsCheck, normalized]);

  return { state, normalized };
}

export const HANDLE_MESSAGE: Record<HandleState, string | null> = {
  idle: null,
  invalid: 'Handles are 3–20 characters: letters, numbers or underscore.',
  checking: 'Checking availability…',
  available: 'That one is free.',
  taken: 'That handle is already taken.',
  error: 'Could not check that handle. You can still try to continue.',
};
