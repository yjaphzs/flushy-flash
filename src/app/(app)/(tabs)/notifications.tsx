import { useMemo } from 'react';

import { List } from '@/components/common/list';
import { EmptyState } from '@/components/feedback/empty-state';
import { Screen } from '@/components/layouts/screen';
import { useScreenTopClearance, useTabBarClearance } from '@/components/layouts/tab-bar-metrics';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { markAllRead } from '@/features/notifications/api';
import {
  NOTIFICATION_ROW_HEIGHT,
  NotificationRow,
} from '@/features/notifications/components/notification-row';
import { useCanWrite } from '@/stores/auth-store';
import { useBuildings, useRestrooms } from '@/stores/campus-store';
import {
  useNotifications,
  useNotificationsError,
  useNotificationsLoading,
} from '@/stores/notifications-store';

/**
 * What happened to the things you contributed.
 *
 * This was a stub for a long time, and its docblock said the reason was that
 * the project had no Cloud Functions and no Blaze plan. That stopped being true
 * some time ago — `functions/` has been deployed since the trust system landed.
 * What did NOT change is the reasoning underneath it: a notification is written
 * BY one party INTO another's inbox, so the collection is server-only
 * (`allow create: if false`, for everybody) and the one client write is
 * `readAt`.
 *
 * The branches mirror the Likes tab deliberately — guest, loading, empty,
 * populated — with one addition it should also have: an ERROR branch. A
 * Firestore `onSnapshot` that fails DETACHES PERMANENTLY, so without this an
 * inbox that errored would render "Nothing yet", which is a lie of exactly the
 * kind the empty state is not allowed to tell.
 */
export default function NotificationsScreen() {
  const clearance = useTabBarClearance();
  const topInset = useScreenTopClearance();
  const canWrite = useCanWrite();
  const requestWrite = useRequestWrite();
  const items = useNotifications();
  const loading = useNotificationsLoading();
  const error = useNotificationsError();
  const restrooms = useRestrooms();
  const buildings = useBuildings();

  /**
   * The place each notification is about, resolved once for the page.
   *
   * Joined in memory because the whole campus is already in the store — the
   * same reasoning the Likes tab uses. A restroom deleted since the
   * notification was written falls back rather than disappearing: the row still
   * says what happened, and its detail page explains the entry is gone.
   */
  const placeNames = useMemo(() => {
    const buildingById = Object.fromEntries(buildings.map((b) => [b.id, b.name]));
    const byId = Object.fromEntries(
      restrooms.map((r) => [
        r.id,
        r.landmark || (r.buildingId ? (buildingById[r.buildingId] ?? 'A restroom') : 'A restroom'),
      ]),
    );
    return byId;
  }, [restrooms, buildings]);

  const unreadIds = useMemo(
    () => items.filter((i) => i.readAt === null).map((i) => i.id),
    [items],
  );

  if (!canWrite) {
    return (
      <Screen style={{ paddingBottom: clearance }}>
        <EmptyState
          icon="bell"
          illustration="bell"
          title="Nothing to catch up on"
          description="Reviews on the restrooms you add, and whether the community confirms them, show up here once you have an account."
          action={
            <Button
              size="lg"
              className="rounded-full"
              onPress={() => requestWrite({ href: '/notifications', reason: 'add' })}
            >
              <Button.Label>Create an account</Button.Label>
            </Button>
          }
          testID="notifications-guest"
        />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen style={{ paddingBottom: clearance }}>
        <View className="flex-1 items-center justify-center">
          <Spinner />
        </View>
      </Screen>
    );
  }

  /*
    Before the empty branch, deliberately. An errored listener has no data and
    would otherwise be indistinguishable from an empty inbox.
  */
  if (error) {
    return (
      <Screen style={{ paddingBottom: clearance }}>
        <EmptyState
          icon="alert-circle"
          title="Could not load your alerts"
          description={error}
          testID="notifications-error"
        />
      </Screen>
    );
  }

  if (items.length === 0) {
    return (
      <Screen style={{ paddingBottom: clearance }}>
        <EmptyState
          icon="bell"
          illustration="bell"
          title="Nothing yet"
          description="Reviews on the restrooms you add, and whether the community confirms them, will show up here."
          testID="notifications-empty"
        />
      </Screen>
    );
  }

  return (
    <Screen topInset={false}>
      <List
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          gap: 12,
          paddingBottom: clearance,
        }}
        estimatedItemSize={NOTIFICATION_ROW_HEIGHT}
        ListHeaderComponent={
          <View
            className="flex-row items-center justify-between gap-3 pb-2"
            style={{ paddingTop: topInset }}
          >
            <Text type="h2" weight="bold" accessibilityRole="header">
              Alerts
            </Text>
            {unreadIds.length > 0 ? (
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full"
                onPress={() => void markAllRead(unreadIds).catch(() => {})}
              >
                <Button.Label>Mark all read</Button.Label>
              </Button>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <NotificationRow
            notification={item}
            placeName={placeNames[item.restroomId] ?? 'A restroom'}
          />
        )}
        testID="notifications"
      />
    </Screen>
  );
}
