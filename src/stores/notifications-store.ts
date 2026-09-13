import { create } from 'zustand';

import type { Notification } from '@/lib/types';

type NotificationsState = {
  /** One page, newest first, exactly as the listener delivers it. */
  items: Notification[];
  loading: boolean;
  error: string | null;
  setItems: (items: Notification[]) => void;
  setError: (message: string | null) => void;
  reset: () => void;
};

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  loading: true,
  error: null,
  setItems: (items) => set({ items, loading: false, error: null }),
  setError: (error) => set({ error, loading: false }),
  // Signing out must empty this, or the next account would briefly see the
  // previous one's inbox — which, unlike a stale list of restrooms, is
  // private correspondence about somebody else.
  reset: () => set({ items: [], loading: false, error: null }),
}));

export const useNotifications = () => useNotificationsStore((s) => s.items);
export const useNotificationsLoading = () => useNotificationsStore((s) => s.loading);
export const useNotificationsError = () => useNotificationsStore((s) => s.error);

/**
 * How many are unread, for the tab badge.
 *
 * Derived from the same page the screen renders rather than from a
 * `where('readAt', '==', null)` query or a counter on the user document.
 *
 * Both alternatives cost more than they give: a second query needs a second
 * composite index and hits the null-filtering trap `functions/src/trust.ts`
 * documents at length, and a counter on `UserProfile` would need a rules key, a
 * recompute function and a backfill — the full `pendingRestroomCount` treatment
 * — for a number that is already sitting in memory.
 *
 * The consequence, stated plainly: the badge counts unread within the newest 50.
 * An inbox with more unread than that under-reports, which is the right
 * direction to be wrong in for a badge nobody can act on 50 items at a time.
 */
export const useUnreadCount = () =>
  useNotificationsStore((s) => s.items.reduce((n, item) => (item.readAt ? n : n + 1), 0));
