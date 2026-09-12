import { useMemo } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Pressable } from '@/components/ui/pressable';
import { ScreenScrollView } from '@/components/layouts/screen';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useBuildings, useCampusLoading, useRestrooms } from '@/stores/campus-store';

export default function BuildingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const buildings = useBuildings();
  const requestWrite = useRequestWrite();
  const restrooms = useRestrooms();

  const building = buildings.find((b) => b.id === id);
  const loading = useCampusLoading();

  // Grouped by floor: on campus "2nd floor, near the east stairwell" is how
  // people actually give directions, so the UI mirrors that.
  const byFloor = useMemo(() => {
    const groups = new Map<number, typeof restrooms>();
    for (const r of restrooms.filter((r) => r.buildingId === id)) {
      groups.set(r.floor, [...(groups.get(r.floor) ?? []), r]);
    }
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [restrooms, id]);

  return (
    <>
      <Stack.Screen options={{ title: building?.name ?? 'Building' }} />
      <ScreenScrollView topInset={false} contentContainerClassName="px-4 py-4 gap-4">
        <View className="gap-1">
          <Text className="text-2xl font-semibold">
            {building?.name ?? (loading ? 'Loading…' : 'Unknown building')}
          </Text>
          {building?.code ? <Text className="text-muted">{building.code}</Text> : null}
        </View>

        {loading && byFloor.length === 0 ? (
          <View className="items-center py-8">
            <Spinner />
          </View>
        ) : byFloor.length === 0 ? (
          <Card>
            <Card.Body>
              <Card.Title>No restrooms listed yet</Card.Title>
              <Card.Description>
                Be the first to add one — it helps everyone who walks in here next.
              </Card.Description>
            </Card.Body>
            <Card.Footer>
              <Button
                onPress={() => requestWrite({ href: `/submit?buildingId=${id}`, reason: 'add' })}
              >
                <Button.Label>Add a restroom</Button.Label>
              </Button>
            </Card.Footer>
          </Card>
        ) : (
          byFloor.map(([floor, items]) => (
            <View key={floor} className="gap-2">
              <Text className="text-sm font-medium text-muted">Floor {floor}</Text>
              {items.map((restroom) => (
                // Card is a presentational Surface, not a Pressable — the press
                // target has to be supplied around it.
                <Pressable
                  key={restroom.id}
                  onPress={() => router.push(`/restroom/${restroom.id}`)}
                  accessibilityRole="button"
                >
                  <Card>
                    <Card.Body>
                      <Card.Title>{restroom.locationNote || `Floor ${restroom.floor}`}</Card.Title>
                      <Card.Description>
                        {restroom.ratingCount > 0
                          ? `${(restroom.ratingSum / restroom.ratingCount).toFixed(1)} · ${restroom.ratingCount} reviews`
                          : 'No reviews yet'}
                      </Card.Description>
                    </Card.Body>
                    {restroom.status !== 'ok' ? (
                      <Card.Footer>
                        <Chip color="warning">
                          <Chip.Label>
                            {restroom.status === 'out_of_order' ? 'Out of order' : 'Closed'}
                          </Chip.Label>
                        </Chip>
                      </Card.Footer>
                    ) : null}
                  </Card>
                </Pressable>
              ))}
            </View>
          ))
        )}

        {byFloor.length > 0 ? (
          <Button
            variant="secondary"
            onPress={() => requestWrite({ href: `/submit?buildingId=${id}`, reason: 'add' })}
          >
            <Button.Label>Add another restroom</Button.Label>
          </Button>
        ) : null}
      </ScreenScrollView>
    </>
  );
}
