import { useCallback, useState } from 'react';
import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/feedback/callout';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { refreshClaims, resendVerification, signOut } from '@/features/auth/api';
import { EmailAddress } from '@/components/common/email-text';
import { AuthScreen } from '@/features/auth/components/auth-screen';
import { authErrorMessage } from '@/features/auth/errors';
import { useAppForeground } from '@/hooks/use-app-foreground';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Where an email/password account waits until its address is confirmed.
 *
 * Dismissible on purpose. The account can back out and browse the map like any
 * guest — writes stay blocked by `useCanWrite`, and the gate brings them back
 * here when they try. Trapping someone because a verification mail was slow or
 * landed in spam is worse than the inconsistency of letting them look around.
 */
export default function VerifyEmailScreen() {
  const email = useAuthStore((s) => s.email);
  const [checking, setChecking] = useState(false);
  const [resent, setResent] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No navigation on success: refreshClaims pushes the reloaded user into the
  // store, and the guard swaps this screen out (AGENTS.md §8).
  const check = useCallback(async (announce: boolean) => {
    setChecking(true);
    setError(null);
    try {
      const verified = await refreshClaims();
      if (!verified && announce) setNotYet(true);
    } catch (e) {
      setError(authErrorMessage(e, 'sign-up'));
    } finally {
      setChecking(false);
    }
  }, []);

  // They left to open the link and came back. Check without nagging.
  useAppForeground(() => void check(false));

  async function onResend() {
    setError(null);
    try {
      await resendVerification();
      setResent(true);
    } catch (e) {
      setError(authErrorMessage(e, 'sign-up'));
    }
  }

  return (
    <AuthScreen
      title="Confirm your email"
      subtitle={
        <>
          We sent a link to {email ? <EmailAddress email={email} /> : 'your address'}. Open it, then
          come back here.
        </>
      }
      onBack={() => router.back()}
      testID="verify-email-screen"
    >
      {error ? (
        <Callout tone="danger" testID="verify-error">
          <Text type="body-sm">{error}</Text>
        </Callout>
      ) : null}

      {notYet && !error ? (
        <Callout tone="danger" testID="verify-not-yet">
          <Text type="body-sm">That address is not confirmed yet. Open the link, then try again.</Text>
        </Callout>
      ) : null}

      {resent && !error ? (
        <Callout tone="success">
          <Text type="body-sm">Sent again. It can take a minute to arrive.</Text>
        </Callout>
      ) : null}

      <View className="gap-3">
        <Button
          size="lg"
          className="rounded-full"
          onPress={() => void check(true)}
          isDisabled={checking}
        >
          {checking ? <Spinner size="sm" /> : null}
          <Button.Label>{checking ? 'Checking…' : 'I have confirmed it'}</Button.Label>
        </Button>

        <Button variant="secondary" size="lg" className="rounded-full" onPress={onResend}>
          <Button.Label>Resend the link</Button.Label>
        </Button>
      </View>

      <View className="items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Keep browsing without confirming"
          hitSlop={12}
          className="h-11 items-center justify-center"
        >
          <Text type="body-sm" weight="medium" className="text-link">
            Keep looking around for now
          </Text>
        </Pressable>

        <Pressable
          onPress={() => signOut()}
          accessibilityRole="button"
          accessibilityLabel="Use a different email"
          hitSlop={12}
          className="h-11 items-center justify-center"
        >
          <Text type="body-sm" color="muted">
            Use a different email
          </Text>
        </Pressable>
      </View>
    </AuthScreen>
  );
}
