import { useMemo } from 'react';
import { useToast } from 'heroui-native';

import { Icon } from '@/components/ui/icon';

/**
 * Transient feedback for an action that could not happen.
 *
 * The provider is already mounted and was going unused: `HeroUINativeProvider`
 * wraps its children in heroui's `ToastProvider` unless `toast` is explicitly
 * `false` (providers/hero-ui-native/provider.js:50), and `app-providers.tsx`
 * passes no such flag. So this file adds no provider — it exists because the
 * import firewall bars `src/app/**` and `src/features/**` from naming
 * `heroui-native`, and a toast is the one piece of feedback with nowhere else
 * to live.
 *
 * ⚠️ **A toast is the LAST resort, not the first.** A screen that can describe
 * its own state should: `map-status.tsx` says what the map is, an empty state
 * says why a list is empty, and a disabled button says why it is disabled.
 * Those survive a glance away from the screen; a toast does not. Reach for this
 * only where the action produces no lasting surface at all — a heart that
 * cannot be filled, a vote that cannot be cast.
 *
 * ⚠️ **There is deliberately no persistent app-wide offline banner.** Both toast
 * placements are already occupied by this app's own floating chrome — the map's
 * search row across the top, the tab pill across the bottom — and the provider's
 * insets are global, so nudging it clear on the map would displace it
 * everywhere. Offline is stated in place instead, on each screen that would
 * otherwise claim the campus is empty.
 */

/**
 * One id per KIND of message, not per call site.
 *
 * heroui dedupes on an explicit id — `show` returns the existing toast and
 * dispatches nothing (providers/toast/provider.js:285-291) — so tapping a
 * blocked control five times produces one toast rather than a stack of five.
 */
const IDS = {
  offline: 'app-offline',
  error: 'app-error',
} as const;

export type AppToast = {
  /** "You are offline" — a blocked write with no in-place surface. */
  offline: (message: string) => void;
  /** Anything else that failed. Pass a message from `firebaseErrorMessage`. */
  error: (message: string) => void;
};

export function useAppToast(): AppToast {
  const { toast } = useToast();

  return useMemo(
    () => ({
      offline: (message) =>
        void toast.show({
          id: IDS.offline,
          variant: 'warning',
          label: "You're offline",
          description: message,
          icon: <Icon name="wifi-off" size={18} color="warning" />,
        }),
      error: (message) =>
        void toast.show({
          id: IDS.error,
          variant: 'danger',
          label: "That didn't work",
          description: message,
          icon: <Icon name="alert-circle" size={18} color="danger" />,
        }),
    }),
    [toast],
  );
}
