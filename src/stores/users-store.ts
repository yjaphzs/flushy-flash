import { create } from 'zustand';

import type { UserProfile } from '@/lib/types';

/**
 * Author profiles, filled on demand.
 *
 * ## Why this is not `campus-store`
 *
 * AGENTS.md §6 argues for holding a whole collection in memory, and that
 * argument is about **bounded cardinality** — ~103 buildings and a few hundred
 * restrooms, fixed by the campus. `users` is the first collection whose size
 * tracks ADOPTION rather than the campus, so a full-collection `onSnapshot`
 * here is not that pattern extended, it is that pattern misapplied.
 *
 * The right precedent is `features/restrooms/use-photo-url.ts`: resolve by key,
 * memoise process-wide, never re-fetch. Same shape, same reasoning.
 */
type UsersState = {
  /**
   * Three states, and the distinction between the first two is the whole point:
   *
   * - `undefined` — not looked up yet. Render a neutral placeholder.
   * - `null`      — looked up, no document. Render the unknown-author fallback.
   * - profile     — the real thing, or a deleted account's tombstone.
   *
   * Collapsing `undefined` into `null` makes every real author flash as an
   * unknown one on a cold list, which is exactly the kind of wrong-for-a-frame
   * bug this codebase keeps fixing.
   */
  byId: Record<string, UserProfile | null | undefined>;
  put: (entries: Record<string, UserProfile | null>) => void;
};

export const useUsersStore = create<UsersState>((set) => ({
  byId: {},
  put: (entries) => set((s) => ({ byId: { ...s.byId, ...entries } })),
}));

/** One author, by uid. Subscribing per-uid keeps an unrelated arrival cheap. */
export const useAuthor = (uid: string | null | undefined) =>
  useUsersStore((s) => (uid ? s.byId[uid] : undefined));
