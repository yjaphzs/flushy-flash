import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/ui/button';
import { EmailAddress } from '@/components/common/email-text';
import { Callout } from '@/components/feedback/callout';
import { Field } from '@/components/forms/field';
import { ScreenScrollView } from '@/components/layouts/screen';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { resetPassword } from '@/features/auth/api';
import { authErrorMessage, isAccountNotFound, isEmailish } from '@/features/auth/errors';
import { CLSU_PRIMARY_DOMAIN } from '@/lib/campus';

/**
 * Presented as a form sheet, so no gradient here — the sheet has its own
 * material and sign-in stays visible behind it.
 */
export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ready = isEmailish(email);

  async function onSubmit() {
    if (!ready || busy) return;
    setBusy(true);
    setFormError(null);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (e) {
      // A missing account is routed into the SUCCESS state on purpose. Showing
      // "no account for that email" would turn this screen into an account
      // enumeration oracle, which the neutral copy below exists to avoid.
      if (isAccountNotFound(e)) {
        setSent(true);
      } else {
        setFormError(authErrorMessage(e, 'reset'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenScrollView contentContainerClassName="gap-5 px-5 py-6" avoidsKeyboard>
      {sent ? (
        <>
          <View className="gap-1">
            <Text type="h3" accessibilityRole="header">
              Check your inbox
            </Text>
            <Text type="body-sm" color="muted">
              If an account exists for <EmailAddress email={email} />, a reset link is on its
              way.
            </Text>
          </View>
          <Button size="lg" className="rounded-full" onPress={() => router.back()}>
            <Button.Label>Done</Button.Label>
          </Button>
        </>
      ) : (
        <>
          <View className="gap-1">
            <Text type="h3" accessibilityRole="header">
              Reset your password
            </Text>
            <Text type="body-sm" color="muted">
              We&apos;ll email you a link to set a new one.
            </Text>
          </View>

          {formError ? (
            <Callout tone="danger" testID="reset-error">
              <Text type="body-sm">{formError}</Text>
            </Callout>
          ) : null}

          <Field>
            <Field.Label>Email</Field.Label>
            <Field.Input
              value={email}
              onChangeText={setEmail}
              leading="mail"
              placeholder={`you@${CLSU_PRIMARY_DOMAIN}`}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="go"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={onSubmit}
              testID="reset-email"
            />
          </Field>

          <Button
            size="lg"
            className="rounded-full"
            onPress={onSubmit}
            isDisabled={busy || !ready}
          >
            {busy ? <Spinner size="sm" /> : null}
            <Button.Label>{busy ? 'Sending…' : 'Send reset link'}</Button.Label>
          </Button>
        </>
      )}
    </ScreenScrollView>
  );
}
