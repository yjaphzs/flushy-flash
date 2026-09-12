import { List } from '@/components/common/list';
import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { ReviewCard } from '@/features/reviews/components/review-card';
import type { ReviewsState } from '@/features/reviews/use-restroom-reviews';

export type ReviewListProps = ReviewsState & {
  /** The restroom detail, rendered above the rows. */
  header: React.ReactNode;
  /** The signed-in user, so their own review gets an edit affordance. */
  uid: string | null;
  /** Bottom padding; this route has no tab bar, so usually just breathing room. */
  bottomInset?: number;
};

/**
 * The reviews for one restroom, with the restroom itself as the list header.
 *
 * ## Why the page inverts around this
 *
 * `/restroom/[id]` used to be a `ScreenScrollView`. A `List` inside one is a
 * nested VirtualizedList — banned, and broken. So the page becomes the list and
 * the detail becomes its `ListHeaderComponent`, which is the standard shape for
 * exactly this.
 *
 * The photo strip inside that header is a HORIZONTAL list, and that nesting is
 * the supported case: different axis, and it is header chrome rather than a row.
 */
export function ReviewList({
  reviews,
  loading,
  error,
  retry,
  header,
  uid,
  bottomInset = 24,
}: ReviewListProps) {
  return (
    <List
      data={reviews}
      keyExtractor={(r) => r.id}
      estimatedItemSize={180}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomInset }}
      ListHeaderComponent={<View className="gap-4 pb-2">{header}</View>}
      ListEmptyComponent={
        loading ? (
          <View className="items-center py-10">
            <Spinner />
          </View>
        ) : error ? (
          /*
            A real retry, not a message. An errored onSnapshot DETACHES
            permanently and never fires again, so there is nothing to wait for.
          */
          <View className="items-center gap-3 py-10">
            <Text type="body-sm" color="muted">
              Reviews could not be loaded.
            </Text>
            <Button variant="secondary" onPress={retry}>
              <Button.Label>Try again</Button.Label>
            </Button>
          </View>
        ) : (
          <EmptyState
            icon="star"
            title="No reviews yet"
            description="Be the first — a sentence about whether it was clean is genuinely useful."
          />
        )
      }
      renderItem={({ item }) => <ReviewCard review={item} isMine={item.authorId === uid} />}
    />
  );
}
