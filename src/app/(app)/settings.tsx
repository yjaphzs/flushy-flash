import { useState } from 'react';
import { router } from 'expo-router';

import { ActionGroup, ActionRow } from '@/components/common/action-row';
import { CampusDomains, EmailAddress } from '@/components/common/email-text';
import { Callout } from '@/components/feedback/callout';
import { FormScreen } from '@/components/layouts/form-screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { refreshClaims, resendVerification } from '@/features/auth/api';
import { authErrorMessage } from '@/features/auth/errors';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { useAuthStatus, useAuthStore, useIsVerifiedStudent } from '@/stores/auth-store';
import { UpdateRow } from '@/features/updates/components/update-row';
import { DeleteAccountRow } from '@/features/auth/components/delete-account-row';

/**
 * Reachable by guests now that the app is guest-first, which this screen was
 * never written for: it used to render "Confirm null to earn the student badge"
 * and offer a resend button whose handler threw unhandled out of onPress.
 *
 * ## Why there is no Sign out here any more
 *
 * Profile has one, and those were the only two `signOut()` call sites in the UI.
 * Two ways to end a session is not redundancy that helps anyone — it is a
 * second thing to find when you are looking for the first. Delete account
 * stays, because it is not the same action and has nowhere else to live.
 *
 * ## Why rows rather than cards
 *
 * Both sections used to be a bare `Card > Card.Title + Card.Description`, which
 * is why they read as plain beside the redesigned Profile. They now use the
 * same `ActionRow` vocabulary, so the two screens look like one app.
 */
export default function SettingsScreen() {
  const status = useAuthStatus();
  const email = useAuthStore((s) => s.email);
  const emailVerified = useAuthStore((s) => s.emailVerified);
  const verifiedStudent = useIsVerifiedStudent();
  const requestWrite = useRequestWrite();

  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGuest = status === 'guest';

  async function run(action: () => Promise<unknown>, onDone?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onDone?.();
    } catch (e) {
      setError(authErrorMessage(e, 'sign-up'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen
      title="Settings"
      subtitle="Your account and this device."
      onBack={() => router.back()}
      contentContainerClassName="gap-5 px-5"
    >
      {error ? (
        <Callout tone="danger" testID="settings-error">
          <Text type="body-sm">{error}</Text>
        </Callout>
      ) : null}

      {sent && !error ? (
        <Callout tone="success">
          <Text type="body-sm">Sent. It can take a minute to arrive.</Text>
        </Callout>
      ) : null}

      <View className="gap-2">
        <Text type="h4">Account</Text>
        <ActionGroup>
          {/*
            Informational, so no `onPress` and no chevron — this row is a state,
            not a destination. The three branches are the same ones the profile
            badge draws, said at length rather than in two words.
          */}
          <ActionRow
            icon="graduation-cap"
            label="Student verification"
            hint={
              isGuest ? (
                <>
                  Students with a <CampusDomains type="body-xs" /> address get a badge,
                  and can edit shared entries.
                </>
              ) : verifiedStudent && email ? (
                <>
                  Verified with <EmailAddress email={email} type="body-xs" />.
                </>
              ) : emailVerified && email ? (
                <>
                  <EmailAddress email={email} type="body-xs" /> is verified, but it is not
                  a <CampusDomains type="body-xs" /> address.
                </>
              ) : (
                <>
                  Confirm {email ? <EmailAddress email={email} type="body-xs" /> : 'your address'}{' '}
                  to earn the student badge.
                </>
              )
            }
          />

          {/*
            Both only exist while there is something to confirm, and ActionGroup
            drops the hairline with them rather than leaving one hanging.
          */}
          {!isGuest && !emailVerified ? (
            <ActionRow
              icon="mail"
              label="Resend verification email"
              hint={busy ? 'Working…' : 'If the first one never arrived'}
              // Dropping onPress while busy makes the row informational — no
              // press target, no chevron — which is the whole disabled state
              // without a prop that only these two rows would ever use.
              onPress={busy ? undefined : () => void run(resendVerification, () => setSent(true))}
            />
          ) : null}
          {!isGuest && !emailVerified ? (
            <ActionRow
              icon="check"
              label="I have confirmed it"
              // Confirming an address does not rotate the ID token by itself,
              // and both the badge rule and the profile-create rule read
              // request.auth.token.email_verified. This forces the rotation.
              hint={busy ? 'Working…' : 'Refresh so the app picks it up'}
              onPress={busy ? undefined : () => void run(refreshClaims)}
            />
          ) : null}
        </ActionGroup>
      </View>

      <View className="gap-2">
        <Text type="h4">This device</Text>
        <ActionGroup>
          <UpdateRow />
        </ActionGroup>
      </View>

      {isGuest ? (
        <Button onPress={() => requestWrite({ href: '/settings', reason: 'profile' })}>
          <Button.Label>Sign in</Button.Label>
        </Button>
      ) : null}

      {/* Destructive actions go last, and Sign out is no longer above it. */}
      {isGuest ? null : <DeleteAccountRow />}

      <Text className="text-center text-xs text-muted">Flushy Flash · CLSU</Text>
    </FormScreen>
  );
}
