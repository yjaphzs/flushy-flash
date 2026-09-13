import { useMemo } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Pressable } from '@/components/ui/pressable';
import { FormScreen } from '@/components/layouts/form-screen';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useBuildings, useCampusLoading, useRestrooms } from '@/stores/campus-store';
import { useIsOnline } from '@/stores/connection-store';

export default function BuildingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const buildings = useBuildings();
  const requestWrite = useRequestWrite();
  const restrooms = useRestrooms();

  const building = buildings.find((b) => b.id === id);
  const loading = useCampusLoading();
  const online = useIsOnline();

  /*
    ⚠️ **"Unknown building" is a claim about the DATABASE.** Offline it is the
    wrong one: the building is almost certainly fine, this phone simply has no
    copy of it. A deep link or a notification tap can land here with a cold
    cache and no signal, and telling someone their building does not exist is
    worse than telling them nothing.
  */
  const title = building?.name ?? (loading ? 'Loading…' : online ? 'Unknown building' : 'Building');

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
      {/*
        The heading is FormScreen's now, not an inline Text — the two used to be
        a native header title and a hand-rolled h1 saying the same thing twice.
      */}
      <FormScreen
        title={title}
        subtitle={building?.code}
        onBack={() => router.back()}
        contentContainerClassName="gap-4 px-5"
      >
        {loading && byFloor.length === 0 ? (
          <View className="items-center py-8">
            <Spinner />
          </View>
        ) : byFloor.length === 0 && !online ? (
          /*
            No "Add a restroom" button, deliberately. The submit flow needs a
            Storage upload and a Firestore write, so offering it here would be
            offering a control that can only fail — the same reason
            `trust-row.tsx` hides the vote buttons from an author.
          */
          <Card>
            <Card.Body>
              <Card.Title>You&apos;re offline</Card.Title>
              <Card.Description>
                This phone has no copy of what is in here. Reconnect to see it.
              </Card.Description>
            </Card.Body>
          </Card>
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
                      {/*
                        NOT ratingSum/ratingCount. Those are aggregates the
                        rules pin to 0 and no client may write, and no Cloud
                        Function maintains them yet — so this card said "No
                        reviews yet" on a restroom with forty. Ratings are read
                        live via getAggregateFromServer on the detail page; a
                        per-row read here would be one query per list item.
                      */}
                      <Card.Description>
                        {restroom.photoIds.length > 0
                          ? `${restroom.photoIds.length} photo${restroom.photoIds.length === 1 ? '' : 's'}`
                          : 'Tap for details'}
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
      </FormScreen>
    </>
  );
}
