import { useMemo } from 'react';

import { EmptyState } from '@/components/feedback/empty-state';
import { List } from '@/components/common/list';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/layouts/screen';
import { useScreenTopClearance, useTabBarClearance } from '@/components/layouts/tab-bar-metrics';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import {
  RESTROOM_ROW_HEIGHT,
  RestroomRow,
} from '@/features/restrooms/components/restroom-row';
import { useCanWrite } from '@/stores/auth-store';
import { useBuildings, useRestrooms } from '@/stores/campus-store';
import { useIsOnline } from '@/stores/connection-store';
import { useLikedIds, useLikesLoading } from '@/stores/likes-store';

/**
 * The restrooms you saved.
 *
 * Structurally the twin of `my-restrooms.tsx` — same `List`, same padding, same
 * row, same `estimatedItemSize`. It had no header of any kind, so the list
 * started at the top of the screen with nothing naming it, and the tab bar's
 * `title` is only an accessibility label. Profile already calls this number
 * "Saved" and routes here; now the screen agrees.
 */
export default function LikesScreen() {
  // Every branch below needs it, and hooks cannot be called inside one.
  const clearance = useTabBarClearance();
  const topInset = useScreenTopClearance();
  const canWrite = useCanWrite();
  const requestWrite = useRequestWrite();
  const likedIds = useLikedIds();
  const loading = useLikesLoading();
  const online = useIsOnline();
  const restrooms = useRestrooms();
  const buildings = useBuildings();

  /**
   * Joined in memory rather than denormalised onto the like document: the whole
   * campus is already in the store (AGENTS.md §6), so this costs nothing and
   * avoids a staleness class.
   *
   * The place name used to be derived here too. `RestroomRow` owns that now, so
   * the Likes tab and "Your restrooms" cannot disagree about what a restroom is
   * called — which they already had, before the row was shared.
   *
   * The order is the listener's: `likes` is queried `orderBy createdAt desc`,
   * so this is newest-saved-first and nothing re-sorts it.
   */
  const saved = useMemo(() => {
    const byId = Object.fromEntries(restrooms.map((r) => [r.id, r]));
    return likedIds.map((id) => byId[id]).filter((r) => r !== undefined);
  }, [likedIds, restrooms]);

  if (!canWrite) {
    return (
      <Screen style={{ paddingBottom: clearance }}>
        <EmptyState
          icon="heart"
          illustration="heart"
          title="Save the good ones"
          description="Keep a list of the restrooms worth walking to. You'll need an account to save them."
          action={
            <Button
              size="lg"
              className="rounded-full"
              onPress={() => requestWrite({ href: '/likes', reason: 'like' })}
            >
              <Button.Label>Create an account</Button.Label>
            </Button>
          }
          testID="likes-guest"
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
    Before the empty branch. This list is a join of two stores, so a cold cache
    with no signal empties it without anything failing — and "Nothing saved yet"
    is a statement about what the user has done, not about the connection.
  */
  if (saved.length === 0 && !online) {
    return (
      <Screen style={{ paddingBottom: clearance }}>
        <EmptyState
          icon="wifi-off"
          title="You're offline"
          description="Your saved restrooms will be here once you have a connection."
          testID="likes-offline"
        />
      </Screen>
    );
  }

  if (saved.length === 0) {
    return (
      <Screen style={{ paddingBottom: clearance }}>
        <EmptyState
          icon="heart"
          illustration="heart"
          title="Nothing saved yet"
          description="Tap the heart on a restroom and it will show up here."
          testID="likes-empty"
        />
      </Screen>
    );
  }

  return (
    // `topInset={false}` because the header inside the list carries it, the
    // same inversion my-restrooms uses.
    <Screen topInset={false}>
      <List
        data={saved}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          gap: 12,
          paddingBottom: clearance,
        }}
        estimatedItemSize={RESTROOM_ROW_HEIGHT}
        ListHeaderComponent={
          <View className="gap-1 pb-2" style={{ paddingTop: topInset }}>
            <Text type="h2" weight="bold" accessibilityRole="header">
              Saved
            </Text>
            {/*
              The ordering, said out loud. It has always been newest-first and
              the screen never mentioned it, which makes a list that reshuffles
              itself when you save something look arbitrary.
            */}
            <Text type="body-sm" color="muted">
              {saved.length === 1 ? '1 restroom' : `${saved.length} restrooms`}, most recently
              saved first.
            </Text>
          </View>
        }
        renderItem={({ item }) => <RestroomRow restroom={item} buildings={buildings} />}
        testID="likes"
      />
    </Screen>
  );
}
