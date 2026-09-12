import { router } from 'expo-router';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Illustration } from '@/components/ui/illustration';
import { CampusDomain, EmailAddress } from '@/components/common/email-text';
import { ScreenScrollView } from '@/components/layouts/screen';
import { useTabBarClearance } from '@/components/layouts/tab-bar-metrics';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { signOut } from '@/features/auth/api';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { JoinBenefits } from '@/features/auth/components/join-benefits';
import { useAuthStatus, useAuthStore, useIsVerifiedStudent } from '@/stores/auth-store';

/**
 * The guest branch is the whole point of this screen now.
 *
 * Until the app went guest-first this file could assume an account existed. It
 * cannot any more, and the old version degraded badly: "Student" as a name, a
 * blank email line, and a "Sign out" button offered to someone who was never
 * signed in. It is also currently the only route into the auth flow, since
 * (auth) is a modal that nothing else pushes to yet.
 */
function GuestProfile() {
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

/**
 * The student badge, and the copy under it.
 *
 * Kept as its own component because the branch is three-way and the parent is
 * already near the 200-line cap.
 */
function StudentBadge() {
  const verified = useIsVerifiedStudent();
  const emailVerified = useAuthStore((s) => s.emailVerified);

  if (verified) {
    return (
      <Chip color="success">
        <Chip.Label>Verified CLSU student</Chip.Label>
      </Chip>
    );
  }

  // Confirmed address, wrong domain. NEUTRAL, deliberately: this is not a
  // problem the person can be said to have — most students signing in with a
  // personal Google account land here — so it gets no warning colour and no
  // word implying something failed.
  if (emailVerified) {
    return (
      <View className="items-center gap-2">
        <Chip color="default" variant="soft">
          <Chip.Label>Not a student account</Chip.Label>
        </Chip>
        <Text type="body-xs" color="muted" align="center">
          A <CampusDomain type="body-xs" /> address unlocks editing shared entries.
        </Text>
      </View>
    );
  }

  // Genuinely unconfirmed — the only one of the three with something to do.
  return (
    <View className="items-center gap-2">
      <Chip color="warning" variant="soft">
        <Chip.Label>Email not confirmed</Chip.Label>
      </Chip>
      <Text type="body-xs" color="muted" align="center">
        Confirm your address to review and edit entries.
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const clearance = useTabBarClearance();
  const requestWrite = useRequestWrite();
  const status = useAuthStatus();
  const displayName = useAuthStore((s) => s.displayName);
  const email = useAuthStore((s) => s.email);
  const photoURL = useAuthStore((s) => s.photoURL);

  if (status === 'guest') return <GuestProfile />;

  return (
    <ScreenScrollView
      contentContainerClassName="gap-6 px-5 py-6"
      contentContainerStyle={{ paddingBottom: clearance }}
    >
      <View className="items-center gap-3">
        <Avatar size="lg">
          {photoURL ? <Avatar.Image source={{ uri: photoURL }} /> : null}
          <Avatar.Fallback />
        </Avatar>
        <View className="items-center gap-1">
          <Text className="text-xl font-semibold">{displayName ?? 'Student'}</Text>
          {email ? <EmailAddress email={email} /> : null}
        </View>

        {/*
          THREE states, not two. The old version collapsed them into one word,
          "Unverified", which reads as "your email is not confirmed" — and for a
          Google account that is simply false: the address IS verified, it just
          is not a CLSU one. The badge was never about email confirmation;
          `useIsVerifiedStudent()` is `emailVerified && endsWith(@clsu.edu.ph)`,
          and only the second conjunct fails here.

          settings.tsx has said the honest thing all along. This is that same
          three-way split, on the screen people actually look at.
        */}
        <StudentBadge />
      </View>

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

      <View className="gap-3">
        {/*
          The second global entry to /submit, now that the centre tab-bar slot
          belongs to "find the nearest restroom". Through requestWrite, not a
          raw push: an account that is signed in but still `needsVerification`
          lands on the right step instead of on a form it cannot submit.
        */}
        <Button variant="secondary" onPress={() => requestWrite({ href: '/submit', reason: 'add' })}>
          <Button.Label>Add a restroom</Button.Label>
        </Button>
        <Button variant="secondary" onPress={() => router.push('/settings')}>
          <Button.Label>Settings</Button.Label>
        </Button>
        <Button variant="danger-soft" onPress={() => signOut()}>
          <Button.Label>Sign out</Button.Label>
        </Button>
      </View>
    </ScreenScrollView>
  );
}
