import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { AuthScreen } from '@/features/auth/components/auth-screen';
import { JoinBenefits } from '@/features/auth/components/join-benefits';
import type { WriteReason } from '@/stores/auth-gate-store';

/**
 * The gate a guest meets when they try to contribute.
 *
 * The headline names the thing they were actually reaching for, because
 * "Create an account" as an answer to "I tapped Add a restroom" is a non
 * sequitur. The benefits below stay constant — the ask changes, the offer
 * doesn't.
 */
const HEADLINES: Record<WriteReason, string> = {
  add: 'Add a restroom',
  review: 'Write a review',
  like: 'Save this restroom',
  confirm: 'Confirm this restroom',
  profile: 'Join Flushy Flash',
};

export default function JoinScreen() {
  const { reason } = useLocalSearchParams<{ reason?: WriteReason }>();
  const title = HEADLINES[reason ?? 'profile'] ?? HEADLINES.profile;

  return (
    <AuthScreen
      title={title}
      subtitle="You'll need an account for that — here's what comes with one."
      onBack={router.canGoBack() ? () => router.back() : undefined}
      testID="join-screen"
    >
      <JoinBenefits />

      <View className="gap-3">
        <Button size="lg" className="rounded-full" onPress={() => router.push('/sign-up')}>
          <Button.Label>Create an account</Button.Label>
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="rounded-full"
          onPress={() => router.push('/sign-in')}
        >
          <Button.Label>I already have one</Button.Label>
        </Button>
      </View>

      <View className="items-center">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Keep browsing without an account"
          hitSlop={12}
          className="h-11 items-center justify-center"
        >
          <Text type="body-sm" color="muted">
            Not now, keep looking around
          </Text>
        </Pressable>
      </View>
    </AuthScreen>
  );
}
