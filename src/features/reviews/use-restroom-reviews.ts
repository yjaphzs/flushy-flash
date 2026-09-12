import { useEffect, useState } from 'react';

import { subscribeToRestroomReviews } from '@/features/reviews/api';
import { ensureAuthors } from '@/features/users/api';
import type { Review } from '@/lib/types';

export type ReviewsState = {
  reviews: Review[];
  loading: boolean;
  error: Error | null;
  /** Re-subscribes. An errored listener never recovers on its own. */
  retry: () => void;
};

/**
 * Live reviews for one restroom, with their authors resolved.
 *
 * ⚠️ **An errored `onSnapshot` detaches permanently.** It does not retry, and
 * it never fires again — the lesson `hooks/use-campus-data.ts` records. So the
 * error state has to offer a real retry rather than assume recovery, which is
 * what `attempt` is for.
 *
 * Author resolution is kicked off from here rather than from the card, so 50
 * rows cost one batched query instead of 50 reads. `ensureAuthors` de-dupes
 * against both the store and its own in-flight set.
 */
export function useRestroomReviews(restroomId: string | undefined): ReviewsState {
  /**
   * One keyed result rather than three loose pieces of state.
   *
   * `react-hooks/set-state-in-effect` rejects the obvious shape — a
   * `setLoading(true)` at the top of the effect body — under the React
   * Compiler. Keying to the subscription instead means a switch between
   * restrooms can never render the previous one's reviews for a frame, which
   * resetting in the body would only have made brief rather than impossible.
   */
  const [result, setResult] = useState<{
    key: string;
    reviews: Review[];
    error: Error | null;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);

  // The attempt is part of the key, so a retry genuinely discards the old
  // result rather than leaving a stale error on screen while it reloads.
  const key = restroomId ? `${restroomId}#${attempt}` : null;

  useEffect(() => {
    if (!restroomId || !key) return;
    let live = true;

    const unsubscribe = subscribeToRestroomReviews(
      restroomId,
      (next) => {
        if (!live) return;
        setResult({ key, reviews: next, error: null });
        // Fire and forget: the cards render a placeholder until it lands.
        void ensureAuthors(next.map((r) => r.authorId));
      },
      (e) => {
        if (!live) return;
        setResult({ key, reviews: [], error: e });
      },
    );

    return () => {
      live = false;
      unsubscribe();
    };
  }, [restroomId, key]);

  const current = key && result?.key === key ? result : null;

  return {
    reviews: current?.reviews ?? [],
    loading: key !== null && current === null,
    error: current?.error ?? null,
    retry: () => setAttempt((n) => n + 1),
  };
}
