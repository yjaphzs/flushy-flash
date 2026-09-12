import { ScreenScrollView } from '@/components/layouts/screen';
import { Text } from '@/components/ui/text';

/** Review composer — wired up in the next pass alongside the reviews API. */
export default function WriteReviewScreen() {
  return (
    <ScreenScrollView contentContainerClassName="px-5 py-5 gap-3">
      <Text className="text-lg font-semibold">Write a review</Text>
      <Text className="text-muted">Coming next: rating, cleanliness and photos.</Text>
    </ScreenScrollView>
  );
}
