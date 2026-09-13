import { useMemo } from 'react';

import { EmptyState } from '@/components/feedback/empty-state';
import { List } from '@/components/common/list';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/layouts/screen';
import { useTabBarClearance } from '@/components/layouts/tab-bar-metrics';
import { Spinner } from '@/components/ui/spinner';
import { View } from '@/components/ui/view';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { RestroomRow } from '@/features/restrooms/components/restroom-row';
import { useCanWrite } from '@/stores/auth-store';
import { useBuildings, useRestrooms } from '@/stores/campus-store';
import { useLikedIds, useLikesLoading } from '@/stores/likes-store';

export default function LikesScreen() {
  // Every branch below needs it, and hooks cannot be called inside one.
  const clearance = useTabBarClearance();
  const canWrite = useCanWrite();
  const requestWrite = useRequestWrite();
  const likedIds = useLikedIds();
  const loading = useLikesLoading();
  const restrooms = useRestrooms();
  const buildings = useBuildings();

  // Joined in memory rather than denormalised onto the like document: the whole
  // campus is already in the store (AGENTS.md §6), so this costs nothing and
  // avoids a staleness class.
  // Joined in memory rather than denormalised onto the like document: the whole
  // campus is already in the store (AGENTS.md §6), so this costs nothing and
  // avoids a staleness class.
  //
  // The place name used to be derived here too. `RestroomRow` owns that now, so
  // the Likes tab and "Your restrooms" cannot disagree about what a restroom is
  // called — which they already had, before the row was shared.
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
    <Screen>
      <List
        data={saved}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: clearance }}
        estimatedItemSize={92}
        renderItem={({ item }) => <RestroomRow restroom={item} buildings={buildings} />}
      />
    </Screen>
  );
}
