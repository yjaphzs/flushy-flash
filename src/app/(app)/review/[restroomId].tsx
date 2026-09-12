import { router } from 'expo-router';

import { FormScreen } from '@/components/layouts/form-screen';
import { Text } from '@/components/ui/text';

/** Review composer — wired up in the next pass alongside the reviews API. */
export default function WriteReviewScreen() {
  return (
    <FormScreen
      title="Write a review"
      onBack={() => router.back()}
      // A formSheet already starts below the status bar, so the window inset
      // would be dead space at the top of the sheet rather than clearance.
      topInset={false}
    >
      <Text className="text-muted">Coming next: rating, cleanliness and photos.</Text>
    </FormScreen>
  );
}
