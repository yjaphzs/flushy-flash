import { useEffect, useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { BackButton } from '@/components/layouts/back-button';
import { FormScreen } from '@/components/layouts/form-screen';
import { Screen } from '@/components/layouts/screen';
import { useScreenTopClearance } from '@/components/layouts/tab-bar-metrics';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { likeRestroom, unlikeRestroom } from '@/features/likes/api';
import { fetchRatingSummary } from '@/features/restrooms/api';
import { DeleteRestroomRow } from '@/features/restrooms/components/delete-restroom-row';
import { PhotoStrip } from '@/features/restrooms/components/photo-strip';
import { TrustRow } from '@/features/restrooms/components/trust-row';
import { ReviewList } from '@/features/reviews/components/review-list';
import { useRestroomReviews } from '@/features/reviews/use-restroom-reviews';
import { useCanWrite, useUid } from '@/stores/auth-store';
import { useBuildings, useCampusLoading, useRestrooms } from '@/stores/campus-store';
import { useIsLiked } from '@/stores/likes-store';
import type { Amenities } from '@/lib/types';

const AMENITY_LABELS: Record<keyof Omit<Amenities, 'genderedAs'>, string> = {
  isFree: 'Free',
  hasWater: 'Has water',
  hasTissue: 'Has tissue',
  hasBidet: 'Has bidet',
  accessible: 'Accessible',
};

export default function RestroomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restrooms = useRestrooms();
  const requestWrite = useRequestWrite();
  const uid = useUid();
  const canWrite = useCanWrite();
  const buildings = useBuildings();
  const reviews = useRestroomReviews(id);
  const topInset = useScreenTopClearance();

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
      {/*
        The page IS the list, and the detail is its header.

        A `List` inside a `ScreenScrollView` is a nested VirtualizedList —
        banned, and broken — so this inverts rather than nesting, which is also
        why `FormScreen` cannot wrap it. The chevron and heading are drawn
        inline from the same `BackButton` FormScreen uses, so the two surfaces
        still look identical.

        The photo strip in the header is a HORIZONTAL list inside a vertical
        one, which is the supported nesting case: different axis, and it is
        header chrome rather than a row.
      */}
      <Screen topInset={false}>
        <ReviewList
          {...reviews}
          uid={uid}
          bottomInset={32}
          header={
            <View className="gap-4" style={{ paddingTop: topInset }}>
              <BackButton onPress={() => router.back()} color="foreground" />

              {/*
                The LANDMARK, matching the map sheet's `landmark || building.name
                || 'Restroom'`. This page used to head itself with
                `locationNote` — so the sheet and the page showed different text
                for the same restroom, and the landmark, which is the thing a
                stranger would actually recognise, appeared nowhere.

                `weight="bold"` because h2 is only semibold by default and this
                is the one line on the page that has to carry.
              */}
              <View className="gap-1">
                <Text type="h2" weight="bold" accessibilityRole="header">
                  {restroom.landmark || building?.name || 'Restroom'}
                </Text>
                <Text type="body-sm" color="muted">
                  {building
                    ? `${building.name} · Floor ${restroom.floor}`
                    : `Floor ${restroom.floor}`}
                </Text>
              </View>

              {/* Photos. This page has never shown them until now. */}
              <PhotoStrip photoIds={restroom.photoIds} />

              {/*
                Where locationNote belongs — it is directions, not a title. Same
                block the sheet already renders, so the two surfaces now agree
                on both the heading and this.
              */}
              {restroom.locationNote ? (
                <View className="gap-1">
                  <Text type="body-xs" weight="semibold" color="muted">
                    HOW TO GET THERE
                  </Text>
                  <Text type="body-sm">{restroom.locationNote}</Text>
                </View>
              ) : null}

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

              <TrustRow restroom={restroom} />

              <View className="flex-row gap-3">
                <Button
                  className="flex-1"
                  onPress={() => requestWrite({ href: `/review/${restroom.id}`, reason: 'review' })}
                >
                  <Button.Label>Write a review</Button.Label>
                </Button>
                <LikeButton restroomId={restroom.id} uid={uid} canWrite={canWrite} />
              </View>

              {/*
                Last in the header, below everything constructive. Renders
                nothing unless the viewer is the author AND nobody else has
                engaged — see its docblock.
              */}
              <DeleteRestroomRow restroom={restroom} />
            </View>
          }
        />
      </Screen>
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
