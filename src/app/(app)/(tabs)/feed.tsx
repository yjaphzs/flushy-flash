import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { View } from '@/components/view';

/**
 * Review feed. Wired to Firestore in the next pass — the follow graph and
 * fan-out-on-read query are designed but not yet built.
 */
export default function FeedScreen() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-2 px-8">
        <Text className="text-lg font-semibold">No reviews yet</Text>
        <Text className="text-center text-muted-foreground">
          Once students start reviewing restrooms, their latest reports show up here.
        </Text>
      </View>
    </Screen>
  );
}
