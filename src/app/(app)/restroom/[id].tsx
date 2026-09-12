import { useEffect, useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { FormScreen } from '@/components/layouts/form-screen';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { likeRestroom, unlikeRestroom } from '@/features/likes/api';
import { Icon } from '@/components/ui/icon';
import { useCanWrite, useUid } from '@/stores/auth-store';
import { useIsLiked } from '@/stores/likes-store';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { fetchRatingSummary } from '@/features/restrooms/api';
import { useBuildings, useCampusLoading, useRestrooms } from '@/stores/campus-store';
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
  const requestWrite = useRequestWrite();
  const uid = useUid();
  const canWrite = useCanWrite();
  const buildings = useBuildings();

  const restroom = restrooms.find((r) => r.id === id);
  const building = buildings.find((b) => b.id === restroom?.buildingId);

  const [rating, setRating] = useState<{ average: number | null; count: number } | null>(null);
  const [ratingFailed, setRatingFailed] = useState(false);
  const loading = useCampusLoading();

  // Read the average from the server rather than a denormalised field: the
  // aggregate is always current, and nothing about it is client-writable.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchRatingSummary(id)
      .then((r) => {
        if (cancelled) return;
        setRating(r);
        setRatingFailed(false);
      })
      // A failed read is NOT zero reviews. Collapsing the two used to tell the
      // user a well-reviewed restroom had none, which is worse than saying
      // nothing.
      .catch(() => !cancelled && setRatingFailed(true));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Distinguish "still loading" from "genuinely gone". The store starts empty,
  // so without this every deep link flashed "no longer listed" first.
  if (!restroom) {
    // Still needs the chevron: with headers off this is otherwise a dead end,
    // and it is reachable by deep link where there is no gesture to fall back on.
    return (
      <FormScreen
        title={loading ? 'Loading…' : 'Not found'}
        onBack={() => router.back()}
        contentContainerClassName="gap-6 px-5 pb-10"
      >
        <View className="items-center gap-3 py-8">
          {loading ? <Spinner /> : <Text>This restroom is no longer listed.</Text>}
        </View>
      </FormScreen>
    );
  }

  const amenityChips = (Object.keys(AMENITY_LABELS) as (keyof typeof AMENITY_LABELS)[]).filter(
    (key) => restroom.amenities[key] === true,
  );

  return (
    <>
      <Stack.Screen options={{ title: building?.name ?? 'Restroom' }} />
      <FormScreen
        title={restroom.locationNote || `Floor ${restroom.floor}`}
        subtitle={building ? `${building.name} · Floor ${restroom.floor}` : `Floor ${restroom.floor}`}
        onBack={() => router.back()}
        contentContainerClassName="gap-4 px-5 pb-10"
      >
        <Card>
          <Card.Body>
            <Card.Title>Rating</Card.Title>
            {ratingFailed ? (
              <Card.Description>Ratings are unavailable right now.</Card.Description>
            ) : rating === null ? (
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

        <View className="flex-row gap-3">
          <Button
            className="flex-1"
            onPress={() => requestWrite({ href: `/review/${restroom.id}`, reason: 'review' })}
          >
            <Button.Label>Write a review</Button.Label>
          </Button>
          <LikeButton restroomId={restroom.id} uid={uid} canWrite={canWrite} />
        </View>
      </FormScreen>
    </>
  );
}

/**
 * Saving is optimistic-free on purpose: the listener in useMyLikes owns the
 * state, so the heart reflects what Firestore actually accepted rather than what
 * we hoped it would. One extra round trip, no lying UI.
 *
 * The filled heart never carries the meaning alone — the accessibility label
 * says which state it is in, for both screen readers and anyone who cannot
 * distinguish the fill.
 */
function LikeButton({
  restroomId,
  uid,
  canWrite,
}: {
  restroomId: string;
  uid: string | null;
  canWrite: boolean;
}) {
  const requestWrite = useRequestWrite();
  const liked = useIsLiked(restroomId);

  function onPress() {
    if (!canWrite || !uid) {
      requestWrite({ href: `/restroom/${restroomId}`, reason: 'like' });
      return;
    }
    const run = liked ? unlikeRestroom : likeRestroom;
    // Fire and forget: a failure leaves the heart where it was, which is the
    // honest outcome, and the listener is the source of truth either way.
    void run(uid, restroomId).catch(() => {});
  }

  return (
    <Button
      isIconOnly
      variant="secondary"
      onPress={onPress}
      accessibilityLabel={liked ? 'Remove from saved' : 'Save this restroom'}
      testID="like-restroom"
    >
      <Icon name="heart" color={liked ? 'danger' : 'muted'} filled={liked} />
    </Button>
  );
}
