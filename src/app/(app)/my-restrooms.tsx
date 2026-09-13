import { useMemo } from 'react';
import { router } from 'expo-router';

import { BackButton } from '@/components/layouts/back-button';
import { List } from '@/components/common/list';
import { EmptyState } from '@/components/feedback/empty-state';
import { Screen } from '@/components/layouts/screen';
import { useScreenTopClearance } from '@/components/layouts/tab-bar-metrics';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { RestroomRow } from '@/features/restrooms/components/restroom-row';
import { PENDING_CAP } from '@/features/restrooms/pending-quota';
import { useUid } from '@/stores/auth-store';
import { useBuildings, useRestrooms } from '@/stores/campus-store';
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
export default function MyRestroomsScreen() {
  const uid = useUid();
  const restrooms = useRestrooms();
  const buildings = useBuildings();
  const topInset = useScreenTopClearance();
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
    const out: ({ kind: 'heading'; id: string; text: string } | {
      kind: 'row';
      id: string;
      restroom: Restroom;
      verified: boolean;
    })[] = [];

    if (waiting.length > 0) {
      out.push({
        kind: 'heading',
        id: 'h-waiting',
        text: `Waiting to be confirmed · ${waiting.length} of ${PENDING_CAP}`,
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

  if (rows.length === 0) {
    return (
      <Screen>
        <View className="px-5" style={{ paddingTop: topInset }}>
          <BackButton onPress={() => router.back()} color="foreground" />
        </View>
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
        />
      </Screen>
    );
  }

  return (
    <Screen topInset={false}>
      <List
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        estimatedItemSize={92}
        ListHeaderComponent={<View className="gap-4 px-1 pb-2">{header}</View>}
        renderItem={({ item }) =>
          item.kind === 'heading' ? (
            <Text type="body-xs" weight="semibold" color="muted" className="pt-2">
              {item.text.toUpperCase()}
            </Text>
          ) : (
            <RestroomRow
              restroom={item.restroom}
              buildings={buildings}
              badge={item.verified ? { label: 'Verified', color: 'success' } : null}
            />
          )
        }
        testID="my-restrooms"
      />
    </Screen>
  );
}
