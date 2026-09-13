import { router } from 'expo-router';

import { Icon, type IconName } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { markRead } from '@/features/notifications/api';
import { relativeTime } from '@/features/restrooms/components/restroom-detail';
import { useAuthor } from '@/stores/users-store';
import type { Notification, NotificationKind } from '@/lib/types';

type Copy = { icon: IconName; title: string; detail: string };

/**
 * What each kind says, in one table.
 *
 * ⚠️ **Three of the four are deliberately impersonal, and must stay so.**
 * `restroomVotes` is owner-scoped in the rules specifically to stop retaliation
 * — on this campus a handle identifies a person — so "Someone found it" is not
 * vague writing, it is the privacy guarantee in prose. The Function does not
 * even send the actor for those kinds, so there is nothing here to leak.
 *
 * `review` names its actor because reviews are world-readable and already show
 * an author chip on the restroom page.
 */
const COPY: Record<NotificationKind, Copy> = {
  review: {
    icon: 'star',
    title: 'reviewed your restroom',
    detail: 'Tap to read it.',
  },
  verified: {
    icon: 'badge-check',
    title: 'is now verified',
    detail: 'Two students confirmed it, so it no longer uses a pending slot.',
  },
  confirmed: {
    icon: 'check',
    title: 'was confirmed',
    detail: 'Someone went and found it.',
  },
  hidden: {
    icon: 'alert-circle',
    title: 'was hidden by reports',
    detail: 'It comes back if someone confirms it. Otherwise it is removed in 7 days.',
  },
};

/**
 * One row of the inbox.
 *
 * The place name comes from the caller rather than being looked up here: the
 * screen already holds the whole campus in memory, and a per-row lookup would
 * be the same mistake a per-row rating read would be.
 */
export function NotificationRow({
  notification,
  placeName,
}: {
  notification: Notification;
  placeName: string;
}) {
  const copy = COPY[notification.kind];
  const actor = useAuthor(notification.actorId);
  const unread = notification.readAt === null;

  // `undefined` is not-looked-up-yet and `null` is looked-up-and-absent — the
  // distinction AuthorChip documents. Neither should render as "undefined".
  const who = notification.kind === 'review' ? (actor?.displayName ?? 'Someone') : null;
  const headline = who ? `${who} ${copy.title}` : `${placeName} ${copy.title}`;

  function open() {
    if (unread) void markRead(notification.id).catch(() => {});
    router.push(`/restroom/${notification.restroomId}`);
  }

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      // The dot is the only thing marking a row unread, and a dot is invisible
      // to a screen reader.
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${headline}. ${copy.detail}`}
      className={`flex-row items-start gap-3 rounded-3xl border border-border px-4 py-3.5 ${
        unread ? 'bg-accent-soft/40' : 'bg-surface'
      }`}
      style={{ borderCurve: 'continuous' }}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft"
        style={{ borderCurve: 'continuous' }}
      >
        <Icon name={copy.icon} size={20} color="accent" />
      </View>

      <View className="flex-1 gap-0.5">
        <Text type="body" weight={unread ? 'semibold' : 'medium'}>
          {headline}
        </Text>
        {/* The place, when the headline led with a person instead. */}
        {who ? (
          <Text type="body-sm" color="muted" numberOfLines={1}>
            {placeName}
          </Text>
        ) : null}
        <Text type="body-xs" color="muted">
          {copy.detail}
        </Text>
        <Text type="body-xs" color="muted">
          {relativeTime(notification.createdAt)}
        </Text>
      </View>

      {unread ? <View className="mt-1.5 size-2 rounded-full bg-accent" /> : null}
    </Pressable>
  );
}

/** Keeps the list's `estimatedItemSize` from drifting from the row. */
export const NOTIFICATION_ROW_HEIGHT = 112;
