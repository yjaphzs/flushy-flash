import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { isCampusEmail } from '@/lib/campus';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Which kind of account this is, and — separately — whether it is finished.
 *
 * ## Two badges, not three
 *
 * The badge answers exactly one question: is this a campus address or not.
 * `CLSU student` / `Outsider`, by domain alone.
 *
 * ⚠️ **That is deliberately NOT the same question as "can this account do
 * things".** The powers come from `isVerifiedStudent()` in firestore.rules,
 * which is the domain AND a confirmed email — so a CLSU address that has never
 * been confirmed gets the badge here while being refused by the server.
 *
 * Rather than fold that back into a third badge, the unconfirmed case gets its
 * own line underneath. It is the only one of the states with something to DO,
 * and burying an action inside a label is how it stops being noticed. An
 * earlier version made the opposite mistake in the other direction: one word,
 * "Unverified", which read as "your email is not confirmed" and was simply
 * false for a Google account whose address is verified and merely not CLSU.
 *
 * The domain is read from the STORE rather than the token, unlike the writes in
 * `auth/api.ts`. This is a label; being a second behind a token rotation costs
 * nothing, whereas a rejected write costs the whole profile create.
 */
export function StudentBadge() {
  const email = useAuthStore((s) => s.email);
  const emailVerified = useAuthStore((s) => s.emailVerified);
  const campus = isCampusEmail(email);

  return (
    <View className="items-center gap-2">
      {campus ? (
        <Chip color="success" variant="soft">
          <Chip.Label>CLSU student</Chip.Label>
        </Chip>
      ) : (
        // NEUTRAL, deliberately: not being a student is not a problem the person
        // can be said to have, and most people signing in with a personal Google
        // account land here. No warning colour, no word implying something failed.
        <Chip color="default" variant="soft">
          <Chip.Label>Outsider</Chip.Label>
        </Chip>
      )}

      {!emailVerified ? (
        <View className="flex-row items-center gap-1.5">
          <Icon name="alert-circle" size={14} color="warning" />
          <Text type="body-xs" color="muted">
            Confirm your email to review and edit.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
