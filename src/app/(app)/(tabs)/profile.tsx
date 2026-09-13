import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { ScreenScrollView } from '@/components/layouts/screen';
import { useTabBarClearance } from '@/components/layouts/tab-bar-metrics';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { signOut } from '@/features/auth/api';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { GuestProfile } from '@/features/profile/components/guest-profile';
import { ProfileHeader } from '@/features/profile/components/profile-header';
import { ActionGroup, ActionRow } from '@/components/common/action-row';
import { ProfileStats } from '@/features/profile/components/profile-stats';
import { useAuthStatus, useAuthStore, useHandle, useUid } from '@/stores/auth-store';

export default function ProfileScreen() {
  const clearance = useTabBarClearance();
  const requestWrite = useRequestWrite();
  const status = useAuthStatus();
  const uid = useUid();
  const handle = useHandle();
  const displayName = useAuthStore((s) => s.displayName);
  const email = useAuthStore((s) => s.email);
  const photoURL = useAuthStore((s) => s.photoURL);

  if (status === 'guest') return <GuestProfile />;

  return (
    /*
      `topInset={false}` and no horizontal padding on the container: the brand
      band is full-bleed and draws under the status bar, and `ProfileHeader`
      applies the safe-area inset to its own contents. Padding the scroll
      container instead would leave a strip of background above the gradient —
      the failure `layouts/screen.tsx` documents.
    */
    <ScreenScrollView
      topInset={false}
      contentContainerClassName="gap-5"
      contentContainerStyle={{ paddingBottom: clearance }}
      testID="profile"
    >
      <ProfileHeader
        displayName={displayName}
        handle={handle}
        email={email}
        photoURL={photoURL}
      />

      <View className="gap-5 px-5">
        <ProfileStats uid={uid} />

        {/* Finish an account that stalled partway, rather than leaving it stuck. */}
        {status === 'needsVerification' || status === 'needsProfile' ? (
          <Button
            size="lg"
            className="rounded-full"
            onPress={() =>
              router.push(status === 'needsVerification' ? '/verify-email' : '/complete-profile')
            }
          >
            <Button.Label>
              {status === 'needsVerification' ? 'Confirm your email' : 'Finish setting up'}
            </Button.Label>
          </Button>
        ) : null}

        <View className="gap-2">
          <Text type="h4">Account</Text>

          {/*
            Every row goes somewhere that EXISTS. Deliberately absent, and each
            for a reason rather than an oversight: "Edit profile" (no such
            screen), "My reviews" (nothing queries reviews by author), and
            "Delete account" — which lives in Settings, where the destructive
            actions are, behind the confirmation it needs.
          */}
          <ActionGroup>
            {/*
              Through requestWrite, not a raw push: an account that is signed in
              but still `needsVerification` lands on the right step instead of
              on a form it cannot submit. This is the second global entry to
              /submit, now that the centre tab-bar slot is "find the nearest".
            */}
            <ActionRow
              icon="plus"
              label="Add a restroom"
              hint="Put one on the map for everyone"
              onPress={() => requestWrite({ href: '/submit', reason: 'add' })}
            />
            <ActionRow
              icon="map-pin"
              label="Your restrooms"
              hint="The ones you added, and whether they are confirmed"
              onPress={() => router.push('/my-restrooms')}
            />
            <ActionRow
              icon="heart"
              label="Saved restrooms"
              hint="The ones you starred"
              onPress={() => router.push('/likes')}
            />
            <ActionRow
              icon="settings"
              label="Settings"
              hint="Account, email and privacy"
              onPress={() => router.push('/settings')}
            />
            <ActionRow icon="log-out" label="Sign out" tone="danger" terminal onPress={signOut} />
          </ActionGroup>
        </View>
      </View>
    </ScreenScrollView>
  );
}
