import { useState } from 'react';
import { router } from 'expo-router';

import { Button } from '@/components/button';
import { ScreenScrollView } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField, TextFieldError, TextFieldInput, TextFieldLabel } from '@/components/text-field';
import { resetPassword } from '@/features/auth/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the reset email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenScrollView contentContainerClassName="px-5 pt-8 gap-5">
      {sent ? (
        <>
          <Text className="text-xl font-semibold">Check your inbox</Text>
          <Text className="text-muted-foreground">
            If an account exists for {email}, a reset link is on its way.
          </Text>
          <Button onPress={() => router.back()}>
            <Button.Label>Done</Button.Label>
          </Button>
        </>
      ) : (
        <>
          <TextField>
            <TextFieldLabel>Email</TextFieldLabel>
            <TextFieldInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@clsu.edu.ph"
            />
            {error ? <TextFieldError>{error}</TextFieldError> : null}
          </TextField>
          <Button onPress={onSubmit} isDisabled={busy || !email}>
            <Button.Label>{busy ? 'Sending…' : 'Send reset link'}</Button.Label>
          </Button>
        </>
      )}
    </ScreenScrollView>
  );
}
