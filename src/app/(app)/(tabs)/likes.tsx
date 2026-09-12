import { useMemo } from 'react';
import { router } from 'expo-router';

import { EmptyState } from '@/components/feedback/empty-state';
import { List } from '@/components/common/list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pressable } from '@/components/ui/pressable';
import { Screen } from '@/components/layouts/screen';
import { useTabBarClearance } from '@/components/layouts/tab-bar-metrics';
import { Spinner } from '@/components/ui/spinner';
import { View } from '@/components/ui/view';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
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
  const saved = useMemo(() => {
    const byId = Object.fromEntries(restrooms.map((r) => [r.id, r]));
    const buildingName = Object.fromEntries(buildings.map((b) => [b.id, b.name]));
    return likedIds
      .map((id) => byId[id])
      .filter((r) => r !== undefined)
      // The landmark the submitter wrote comes first: it is the thing they chose
      // as recognisable. The building name is the fallback, and buildingId is
      // nullable now — a pin beside the lagoon belongs to no building at all.
      .map((r) => ({
        ...r,
        placeName:
          r.landmark ||
          (r.buildingId ? (buildingName[r.buildingId] ?? 'Unknown building') : 'On campus'),
      }));
  }, [likedIds, restrooms, buildings]);

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
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/restroom/${item.id}`)}>
            <Card>
              <Card.Body>
                <Card.Title>{item.placeName}</Card.Title>
                <Card.Description>
                  Floor {item.floor}
                  {item.locationNote ? ` · ${item.locationNote}` : ''}
                </Card.Description>
              </Card.Body>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
