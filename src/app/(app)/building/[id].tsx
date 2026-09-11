import { useMemo } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { Pressable } from '@/components/pressable';
import { ScreenScrollView } from '@/components/screen';
import { Text } from '@/components/text';
import { View } from '@/components/view';
import { useBuildings, useRestrooms } from '@/stores/campus-store';

export default function BuildingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const buildings = useBuildings();
  const restrooms = useRestrooms();

  const building = buildings.find((b) => b.id === id);

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
      <ScreenScrollView contentContainerClassName="px-4 py-4 gap-4">
        <View className="gap-1">
          <Text className="text-2xl font-semibold">{building?.name ?? 'Unknown building'}</Text>
          {building?.code ? (
            <Text className="text-muted-foreground">{building.code}</Text>
          ) : null}
        </View>

        {byFloor.length === 0 ? (
          <Card>
            <Card.Body>
              <Card.Title>No restrooms listed yet</Card.Title>
              <Card.Description>
                Be the first to add one — it helps everyone who walks in here next.
              </Card.Description>
            </Card.Body>
            <Card.Footer>
              <Button onPress={() => router.push(`/submit?buildingId=${id}`)}>
                <Button.Label>Add a restroom</Button.Label>
              </Button>
            </Card.Footer>
          </Card>
        ) : (
          byFloor.map(([floor, items]) => (
            <View key={floor} className="gap-2">
              <Text className="text-sm font-medium text-muted-foreground">Floor {floor}</Text>
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
          <Button variant="secondary" onPress={() => router.push(`/submit?buildingId=${id}`)}>
            <Button.Label>Add another restroom</Button.Label>
          </Button>
        ) : null}
      </ScreenScrollView>
    </>
  );
}
