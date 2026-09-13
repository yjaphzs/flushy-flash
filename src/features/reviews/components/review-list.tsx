import { List } from '@/components/common/list';
import { useScreenBottomClearance } from '@/components/layouts/tab-bar-metrics';
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
 *
 * ## ⚠️ The gutter is on the ROWS, not on the content container
 *
 * `contentContainerStyle` wraps the header too, so a `paddingHorizontal`
 * there would inset the header — and the header opens on a full-bleed photo
 * hero that has to reach both edges. Padding the rows individually is what
 * lets the header run edge to edge while the reviews stay in the same 20pt
 * gutter as every FormScreen in the app.
 */
export function ReviewList({
  reviews,
  loading,
  error,
  retry,
  header,
  uid,
}: ReviewListProps) {
  /*
    This screen owns its own list rather than sitting in a ScreenScrollView,
    so nothing pads it for us — see the Screen docblock. It used to be a
    hardcoded 24, which on a three-button phone left the last review touching
    the navigation bar.
  */
  const paddingBottom = useScreenBottomClearance();

  return (
    <List
      data={reviews}
      keyExtractor={(r) => r.id}
      estimatedItemSize={180}
      contentContainerStyle={{ gap: 12, paddingBottom }}
      // The header owns its own spacing, including its top inset.
      ListHeaderComponent={<View className="pb-2">{header}</View>}
      ListEmptyComponent={
        loading ? (
          <View className="items-center px-5 py-10">
            <Spinner />
          </View>
        ) : error ? (
          /*
            A real retry, not a message. An errored onSnapshot DETACHES
            permanently and never fires again, so there is nothing to wait for.
          */
          <View className="items-center gap-3 px-5 py-10">
            <Text type="body-sm" color="muted">
              Reviews could not be loaded.
            </Text>
            <Button variant="secondary" onPress={retry}>
              <Button.Label>Try again</Button.Label>
            </Button>
          </View>
        ) : (
          <View className="px-5">
            <EmptyState
              icon="star"
              title="No reviews yet"
              description="Be the first — a sentence about whether it was clean is genuinely useful."
            />
          </View>
        )
      }
      renderItem={({ item }) => (
        <View className="px-5">
          <ReviewCard review={item} isMine={item.authorId === uid} />
        </View>
      )}
    />
  );
}
