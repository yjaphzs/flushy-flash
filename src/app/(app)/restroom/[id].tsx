import { useEffect, useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ScreenScrollView } from '@/components/screen';
import { Spinner } from '@/components/spinner';
import { Text } from '@/components/text';
import { View } from '@/components/view';
import { fetchRatingSummary } from '@/features/restrooms/api';
import { useBuildings, useRestrooms } from '@/stores/campus-store';
import type { Amenities } from '@/lib/types';

const AMENITY_LABELS: Record<keyof Omit<Amenities, 'genderedAs'>, string> = {
  isFree: 'Free',
  hasWater: 'Has water',
  hasTissue: 'Has tissue',
  hasBidet: 'Has bidet',
  accessible: 'Accessible',
  babyChanging: 'Baby changing',
};

export default function RestroomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restrooms = useRestrooms();
  const buildings = useBuildings();

  const restroom = restrooms.find((r) => r.id === id);
  const building = buildings.find((b) => b.id === restroom?.buildingId);

  const [rating, setRating] = useState<{ average: number | null; count: number } | null>(null);

  // Read the average from the server rather than a denormalised field: the
  // aggregate is always current, and nothing about it is client-writable.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchRatingSummary(id)
      .then((r) => !cancelled && setRating(r))
      .catch(() => !cancelled && setRating({ average: null, count: 0 }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!restroom) {
    return (
      <ScreenScrollView>
        <Text>This restroom is no longer listed.</Text>
      </ScreenScrollView>
    );
  }

  const amenityChips = (Object.keys(AMENITY_LABELS) as (keyof typeof AMENITY_LABELS)[]).filter(
    (key) => restroom.amenities[key] === true,
  );

  return (
    <>
      <Stack.Screen options={{ title: building?.name ?? 'Restroom' }} />
      <ScreenScrollView contentContainerClassName="px-4 py-4 gap-4">
        <View className="gap-1">
          <Text className="text-2xl font-semibold">
            {restroom.locationNote || `Floor ${restroom.floor}`}
          </Text>
          <Text className="text-muted-foreground">
            {building?.name} · Floor {restroom.floor}
          </Text>
        </View>

        <Card>
          <Card.Body>
            <Card.Title>Rating</Card.Title>
            {rating === null ? (
              <Spinner />
            ) : (
              <Card.Description>
                {rating.count > 0
                  ? `${rating.average?.toFixed(1)} out of 5 · ${rating.count} reviews`
                  : 'No reviews yet. Yours would be the first.'}
              </Card.Description>
            )}
          </Card.Body>
        </Card>

        {amenityChips.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {amenityChips.map((key) => (
              <Chip key={key}>
                <Chip.Label>{AMENITY_LABELS[key]}</Chip.Label>
              </Chip>
            ))}
          </View>
        ) : null}

        <Button onPress={() => router.push(`/review/${restroom.id}`)}>
          <Button.Label>Write a review</Button.Label>
        </Button>
      </ScreenScrollView>
    </>
  );
}
