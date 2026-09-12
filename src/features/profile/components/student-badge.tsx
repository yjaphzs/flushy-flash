import { Chip } from '@/components/ui/chip';
import { CampusDomain } from '@/components/common/email-text';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useAuthStore, useIsVerifiedStudent } from '@/stores/auth-store';

/**
 * The student badge, and the copy under it.
 *
 * THREE states, not two. An earlier version collapsed them into one word,
 * "Unverified", which reads as "your email is not confirmed" — and for a Google
 * account that is simply false: the address IS verified, it just is not a CLSU
 * one. The badge was never about email confirmation;
 * `useIsVerifiedStudent()` is `emailVerified && endsWith(@clsu.edu.ph)`, and
 * only the second conjunct fails there.
 *
 * settings.tsx has said the honest thing all along. This is that same three-way
 * split, on the screen people actually look at.
 */
export function StudentBadge() {
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
