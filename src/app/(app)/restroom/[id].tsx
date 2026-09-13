import { useEffect, useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { FormScreen } from '@/components/layouts/form-screen';
import { Screen } from '@/components/layouts/screen';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { fetchRatingSummary } from '@/features/restrooms/api';
import { RestroomDetailHeader } from '@/features/restrooms/components/restroom-detail-header';
import { ReviewList } from '@/features/reviews/components/review-list';
import { useRestroomReviews } from '@/features/reviews/use-restroom-reviews';
import { useUid } from '@/stores/auth-store';
import { useBuildings, useCampusLoading, useRestrooms } from '@/stores/campus-store';

/**
 * One restroom, in full.
 *
 * The counterpart to the map sheet, which is a glance. Everything that needs
 * room — the photos, the directions, the amenity grid with its unknowns, the
 * confirm/report buttons and the reviews — lives here, and the sheet's only
 * job is to get you to it.
 *
 * The detail itself is `RestroomDetailHeader`; see that file for why it is a
 * component rather than JSX in this route.
 */
export default function RestroomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restrooms = useRestrooms();
  const buildings = useBuildings();
  const reviews = useRestroomReviews(id);
  const uid = useUid();
  const loading = useCampusLoading();

  const restroom = restrooms.find((r) => r.id === id);
  const building = buildings.find((b) => b.id === restroom?.buildingId);

  /**
   * The review COUNT, for the stat row. Read from the server aggregate rather
   * than a denormalised field, and kept here rather than in the header so the
   * header stays presentational.
   *
   * ⚠️ A failed read is NOT zero reviews, which is why this stays `null` on
   * error rather than falling back to 0. Collapsing the two used to tell the
   * viewer a well-reviewed restroom had none.
   */
  const [reviewCount, setReviewCount] = useState<{ id: string; count: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchRatingSummary(id)
      .then((r) => !cancelled && setReviewCount({ id, count: r.count }))
      .catch(() => {
        // The tile shows an em dash. ScoreBar reports the rating's own failure.
      });
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
        contentContainerClassName="gap-6 px-5"
      >
        <View className="items-center gap-3 py-8">
          {loading ? <Spinner /> : <Text>This restroom is no longer listed.</Text>}
        </View>
      </FormScreen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: building?.name ?? 'Restroom' }} />
      {/*
        The page IS the list, and the detail is its header.

        A `List` inside a `ScreenScrollView` is a nested VirtualizedList —
        banned, and broken — so this inverts rather than nesting, which is also
        why `FormScreen` cannot wrap it.

        `topInset={false}` because the hero is full-bleed and runs under the
        status bar on purpose; the back button positions itself against the
        clearance instead.
      */}
      <Screen topInset={false}>
        <ReviewList
          {...reviews}
          uid={uid}
          header={
            <RestroomDetailHeader
              restroom={restroom}
              building={building}
              reviewCount={reviewCount?.id === id ? reviewCount.count : null}
            />
          }
        />
      </Screen>
    </>
  );
}
