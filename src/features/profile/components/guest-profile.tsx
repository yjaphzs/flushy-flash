import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Illustration } from '@/components/ui/illustration';
import { ScreenScrollView } from '@/components/layouts/screen';
import { useTabBarClearance } from '@/components/layouts/tab-bar-metrics';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { JoinBenefits } from '@/features/auth/components/join-benefits';

/**
 * The guest branch is the whole point of this screen now.
 *
 * Until the app went guest-first this file could assume an account existed. It
 * cannot any more, and the old version degraded badly: "Student" as a name, a
 * blank email line, and a "Sign out" button offered to someone who was never
 * signed in. It is also currently the only route into the auth flow, since
 * (auth) is a modal that nothing else pushes to yet.
 *
 * ⚠️ **Deliberately NOT restyled alongside the signed-in redesign.** It is built
 * on `JoinBenefits`, which Profile shares with `/join` and the submit gate —
 * that component's own docblock says restyling one and not the others "would
 * read as an oversight rather than a distinction". Changing it means changing
 * three screens, which is its own piece of work.
 */
export function GuestProfile() {
  const clearance = useTabBarClearance();

  return (
    <ScreenScrollView
      contentContainerClassName="gap-6 px-5 py-6"
      // Uniwind composes contentContainerStyle = [classNameStyles, style], so
      // this overrides py-6's bottom half rather than adding to it.
      contentContainerStyle={{ paddingBottom: clearance }}
      testID="guest-profile"
    >
      <View className="items-center gap-3">
        {/*
          The 3D padlock REPLACES the Avatar placeholder rather than sitting
          beside it. An empty avatar on a page with no account is a picture of
          a person who does not exist — it reads as a failed image load, not as
          a state. The lock says what the screen is actually about.
        */}
        <Illustration name="lock" size={132} />
        <View className="items-center gap-1">
          <Text type="h3">You&apos;re browsing as a guest</Text>
          <Text type="body-sm" color="muted" align="center">
            The map is all yours. An account is only needed to contribute.
          </Text>
        </View>
      </View>

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
    </ScreenScrollView>
  );
}
