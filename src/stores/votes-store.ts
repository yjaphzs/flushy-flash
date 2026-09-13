import { create } from 'zustand';

import type { VoteKind } from '@/features/restrooms/votes-api';

type VotesState = {
  /**
   * How this user voted on each restroom, keyed for O(1) lookup — the trust row
   * asks this on every render, so an array scan would be the wrong shape.
   *
   * Absent means "has not voted", which is genuinely different from either
   * value and must not collapse into one.
   */
  votes: Record<string, VoteKind>;
  loading: boolean;
  error: string | null;
  setVotes: (votes: Record<string, VoteKind>) => void;
  setError: (message: string | null) => void;
  reset: () => void;
};

export const useVotesStore = create<VotesState>((set) => ({
  votes: {},
  loading: true,
  error: null,
  setVotes: (votes) => set({ votes, loading: false, error: null }),
  setError: (error) => set({ error, loading: false }),
  // Signing out must empty this, or the next account would inherit the previous
  // one's votes and be shown as having vouched for entries it has never seen.
  reset: () => set({ votes: {}, loading: false, error: null }),
}));

export const useMyVote = (restroomId: string): VoteKind | null =>
  useVotesStore((s) => s.votes[restroomId] ?? null);
