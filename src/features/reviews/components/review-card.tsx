import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { PhotoStrip } from '@/features/restrooms/components/photo-strip';
import { openPhotos } from '@/features/restrooms/photo-viewer';
import { relativeTime } from '@/features/restrooms/components/restroom-detail';
import { Stars } from '@/features/reviews/components/stars';
import { AuthorChip } from '@/features/users/components/author-chip';
import type { Review } from '@/lib/types';

/**
 * One review.
 *
 * The author goes through `AuthorChip`, which is the single rendering path for
 * an author anywhere in the app — that is what makes a deleted account's
 * tombstone render correctly here with no branch of its own.
 *
 * `relativeTime` already tolerates the null a `serverTimestamp()` local
 * snapshot produces before the server round trip lands, so a just-posted review
 * does not crash the list it was optimistically added to.
 */
export function ReviewCard({ review, isMine }: { review: Review; isMine: boolean }) {
  return (
    <View className="gap-3 rounded-2xl bg-surface p-4" style={{ borderCurve: 'continuous' }}>
      <View className="flex-row items-start justify-between gap-3">
        <AuthorChip authorId={review.authorId} />
        <Text type="body-xs" color="muted">
          {relativeTime(review.updatedAt)}
        </Text>
      </View>

      <View className="gap-1">
        <Stars value={review.rating} label="Overall" />
        <Stars value={review.cleanliness} label="Cleanliness" />
      </View>

      {review.text ? <Text type="body-sm">{review.text}</Text> : null}

      {/*
        A review's photos open in the same viewer as a restroom's, which is the
        reason it reads its set from a store rather than a restroom id — a
        review is not in `campus-store` and could not be looked up from a
        route param.
      */}
      {review.photoIds.length > 0 ? (
        <PhotoStrip
          photoIds={review.photoIds}
          onPhotoPress={(index) => openPhotos(review.photoIds, index)}
        />
      ) : null}

      {/*
        The edit affordance lives on the card rather than pinning your own
        review to the top: pinning-and-filtering introduces an off-by-one
        against the 50-row window for no visible gain.
      */}
      {isMine ? (
        <Button
          variant="secondary"
          onPress={() => router.push(`/review/${review.restroomId}`)}
          accessibilityLabel="Edit your review"
        >
          <Button.Label>Edit your review</Button.Label>
        </Button>
      ) : null}
    </View>
  );
}
