import { useState } from 'react';
import { router } from 'expo-router';

import { CampusDomain, EmailAddress } from '@/components/common/email-text';
import { Callout } from '@/components/feedback/callout';
import { FormScreen } from '@/components/layouts/form-screen';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { refreshClaims, resendVerification, signOut } from '@/features/auth/api';
import { authErrorMessage } from '@/features/auth/errors';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { useAuthStatus, useAuthStore, useIsVerifiedStudent } from '@/stores/auth-store';
import { UpdateRow } from '@/features/updates/components/update-row';

/**
 * Reachable by guests now that the app is guest-first, which this screen was
 * never written for: it used to render "Confirm null to earn the student badge"
 * and offer a resend button whose handler threw unhandled out of onPress.
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
      contentContainerClassName="gap-4 px-5 pb-10"
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

      <Card>
        <Card.Body>
          <Card.Title>Student verification</Card.Title>
          {/*
            Four branches, as JSX rather than template literals, so the address
            and the domain can carry their own tint. Card.Description accepts a
            ReactNode, and each nested run repeats `type` because a nested Text
            does not inherit the outer variant's typography.
          */}
          <Card.Description>
            <UpdateRow />

      {isGuest ? (
              <>
                Students with a <CampusDomain /> address get a badge, and can edit shared
                entries.
              </>
            ) : verifiedStudent && email ? (
              <>
                Verified with <EmailAddress email={email} />.
              </>
            ) : emailVerified && email ? (
              <>
                <EmailAddress email={email} /> is verified, but it is not a <CampusDomain />{' '}
                address.
              </>
            ) : (
              <>
                Confirm {email ? <EmailAddress email={email} /> : 'your email address'} to earn the
                student badge.
              </>
            )}
          </Card.Description>
        </Card.Body>

        {isGuest ? (
          <Card.Footer>
            <Button
              variant="secondary"
              onPress={() => requestWrite({ href: '/settings', reason: 'profile' })}
            >
              <Button.Label>Create an account</Button.Label>
            </Button>
          </Card.Footer>
        ) : null}

        {!isGuest && !emailVerified ? (
          <Card.Footer>
            <View className="w-full gap-2">
              <Button
                variant="secondary"
                isDisabled={busy}
                onPress={() => void run(resendVerification, () => setSent(true))}
              >
                <Button.Label>Resend verification email</Button.Label>
              </Button>
              {/* Confirming an address does not rotate the ID token by itself,
                  and both the badge rule and the profile-create rule read
                  request.auth.token.email_verified. This forces the rotation. */}
              <Button variant="secondary" isDisabled={busy} onPress={() => void run(refreshClaims)}>
                <Button.Label>I have confirmed it — refresh</Button.Label>
              </Button>
            </View>
          </Card.Footer>
        ) : null}
      </Card>

      {isGuest ? (
        <Button onPress={() => requestWrite({ href: '/settings', reason: 'profile' })}>
          <Button.Label>Sign in</Button.Label>
        </Button>
      ) : (
        <Button variant="danger-soft" onPress={() => signOut()}>
          <Button.Label>Sign out</Button.Label>
        </Button>
      )}

      <Text className="text-center text-xs text-muted">Flushy Flash · CLSU</Text>
    </FormScreen>
  );
}
