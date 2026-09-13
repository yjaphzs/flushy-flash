import { useMemo } from 'react';
import { router } from 'expo-router';

import { BackButton } from '@/components/layouts/back-button';
import { List } from '@/components/common/list';
import { EmptyState } from '@/components/feedback/empty-state';
import { Screen } from '@/components/layouts/screen';
import {
  useScreenBottomClearance,
  useScreenTopClearance,
} from '@/components/layouts/tab-bar-metrics';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { confirmationSummary } from '@/features/restrooms/confirmations';
import {
  RESTROOM_ROW_HEIGHT,
  RestroomRow,
} from '@/features/restrooms/components/restroom-row';
import { PENDING_CAP } from '@/features/restrooms/pending-quota';
import { useUid } from '@/stores/auth-store';
import { useBuildings, useCampusLoading, useRestrooms } from '@/stores/campus-store';
import { useIsOnline } from '@/stores/connection-store';
import type { Restroom } from '@/lib/types';

/**
 * Everything this account has put on the map.
 *
 * Answers the question the Profile's "Added" number raised and could not
 * answer. It needs **no new store, query, listener or index**: `campus-store`
 * already holds every restroom because the whole app is one campus (§6), and
 * `createdBy` is on each one — the same filter `profile-stats.tsx` and
 * `pending-quota.ts` already run.
 *
 * ⚠️ **Not a `FormScreen`.** That wraps `ScreenScrollView`, and a virtualised
 * `List` inside a ScrollView is a nested VirtualizedList — banned, and broken.
 * So the page IS the list and its chrome is the header, exactly as
 * `/restroom/[id]` does with its reviews.
 *
 * ⚠️ **Not a tab either.** `FloatingTabBar` splits the pill at the midpoint of
 * `state.routes`, so a fifth tab would misplace the centre action.
 *
 * Pending comes FIRST, and that ordering is the point of the screen rather than
 * a preference: an unverified restroom is the one holding a contribution slot,
 * so it is what someone who cannot add another has come here to see.
 */
/**
 * The contribution cap, as three pips rather than as arithmetic.
 *
 * ⚠️ The count has LEFT the heading text to make room for these — it used to
 * read "WAITING TO BE CONFIRMED · 1 OF 3". So the pips carry the only copy of
 * that number, and without an accessibilityLabel a screen reader would get the
 * words and lose the quantity entirely. The row of dots is one accessible
 * element, not three: "1 of 3 slots in use" is the fact, and three separate
 * "filled dot" announcements are not.
 */
function SlotPips({ used }: { used: number }) {
  return (
    <View
      className="flex-row items-center gap-1"
      accessible
      accessibilityLabel={`${used} of ${PENDING_CAP} slots in use`}
    >
      {Array.from({ length: PENDING_CAP }, (_, i) => (
        <View
          key={i}
          className={`size-1.5 rounded-full ${i < used ? 'bg-accent' : 'bg-border'}`}
        />
      ))}
    </View>
  );
}

export default function MyRestroomsScreen() {
  const uid = useUid();
  const restrooms = useRestrooms();
  const buildings = useBuildings();
  const loading = useCampusLoading();
  const online = useIsOnline();
  const topInset = useScreenTopClearance();
  // No tab bar on this route, and Screen pads nothing — the list owns it.
  const paddingBottom = useScreenBottomClearance();
  const requestWrite = useRequestWrite();

  const { rows, pending } = useMemo(() => {
    const mine = uid ? restrooms.filter((r) => r.createdBy === uid) : [];
    // Newest first. Campus order is whatever the snapshot delivered, and
    // `createdAt` is a Firestore Timestamp with seconds, not a Date.
    const byNewest = (a: Restroom, b: Restroom) =>
      (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);

    const waiting = mine.filter((r) => !r.verified).sort(byNewest);
    const confirmed = mine.filter((r) => r.verified).sort(byNewest);

    // One flat list with section markers rather than two Lists: nesting
    // virtualised lists is the thing `list.tsx` exists to prevent.
    const out: (
      | { kind: 'heading'; id: string; text: string; slotsUsed?: number }
      | { kind: 'row'; id: string; restroom: Restroom; verified: boolean }
    )[] = [];

    if (waiting.length > 0) {
      out.push({
        kind: 'heading',
        id: 'h-waiting',
        text: 'Waiting to be confirmed',
        slotsUsed: waiting.length,
      });
      for (const r of waiting) out.push({ kind: 'row', id: r.id, restroom: r, verified: false });
    }
    if (confirmed.length > 0) {
      out.push({ kind: 'heading', id: 'h-verified', text: 'Verified by the community' });
      for (const r of confirmed) out.push({ kind: 'row', id: r.id, restroom: r, verified: true });
    }

    return { rows: out, pending: waiting.length };
  }, [restrooms, uid]);

  const header = (
    <View className="gap-4" style={{ paddingTop: topInset }}>
      <BackButton onPress={() => router.back()} color="foreground" />
      <View className="gap-1">
        <Text type="h2" weight="bold" accessibilityRole="header">
          Your restrooms
        </Text>
        <Text type="body-sm" color="muted">
          {pending >= PENDING_CAP
            ? `All ${PENDING_CAP} of your slots are waiting to be confirmed. Verifying one frees a slot.`
            : 'Two students confirming one moves it out of your pending slots.'}
        </Text>
      </View>
    </View>
  );

  /*
    ⚠️ **An empty list has three causes here and they are not interchangeable.**
    This screen derives its rows from `campus-store`, so it is empty before the
    snapshot lands and empty when the snapshot came from an empty disk cache —
    and until now both rendered "Nothing added yet", which is a claim about what
    the user has contributed. Offline is checked FIRST because it is the durable
    one: a cold cache with no signal never stops being empty, so a spinner there
    would spin forever and the empty state would be a lie about their own work.
  */
  const shell = (content: React.ReactNode) => (
    <Screen>
      <View className="px-5" style={{ paddingTop: topInset }}>
        <BackButton onPress={() => router.back()} color="foreground" />
      </View>
      {content}
    </Screen>
  );

  if (rows.length === 0 && !online) {
    return shell(
      <EmptyState
        icon="wifi-off"
        title="You're offline"
        description="Your restrooms are on the way — this list fills in once you have a connection."
        testID="my-restrooms-offline"
      />,
    );
  }

  if (rows.length === 0 && loading) {
    return shell(
      <View className="flex-1 items-center justify-center">
        <Spinner />
      </View>,
    );
  }

  if (rows.length === 0) {
    return shell(
      <EmptyState
        icon="map-pin"
        title="Nothing added yet"
        description="Restrooms you put on the map show up here, with whether the community has confirmed them."
        action={
          <Button
            size="lg"
            className="rounded-full"
            onPress={() => requestWrite({ href: '/submit', reason: 'add' })}
          >
            <Button.Label>Add a restroom</Button.Label>
          </Button>
        }
        testID="my-restrooms-empty"
      />,
    );
  }

  return (
    <Screen topInset={false}>
      <List
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, gap: 12, paddingBottom }}
        estimatedItemSize={RESTROOM_ROW_HEIGHT}
        ListHeaderComponent={<View className="gap-4 px-1 pb-2">{header}</View>}
        renderItem={({ item }) =>
          item.kind === 'heading' ? (
            <View className="flex-row items-center gap-2 pt-2">
              <Text type="body-xs" weight="semibold" color="muted">
                {item.text.toUpperCase()}
              </Text>
              {item.slotsUsed === undefined ? null : <SlotPips used={item.slotsUsed} />}
            </View>
          ) : (
            <RestroomRow
              restroom={item.restroom}
              buildings={buildings}
              badge={item.verified ? { label: 'Verified', color: 'success' } : null}
              /*
                Only the waiting ones. On a verified restroom the badge already
                says so, and "4 people found this" under it would be restating
                the outcome as though it were still in progress.
              */
              footer={
                item.verified ? null : (
                  <Text type="body-xs" color="muted">
                    {confirmationSummary(item.restroom.confirmCount)}
                  </Text>
                )
              }
            />
          )
        }
        testID="my-restrooms"
      />
    </Screen>
  );
}
