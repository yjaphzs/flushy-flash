import { useState } from 'react';
import { Link } from 'expo-router';

import { Button } from '@/components/button';
import { ScreenScrollView } from '@/components/screen';
import { Text } from '@/components/text';
import { View } from '@/components/view';
import {
  TextField,
  TextFieldDescription,
  TextFieldError,
  TextFieldInput,
  TextFieldLabel,
} from '@/components/text-field';
import { isHandleAvailable, isValidHandle, normalizeHandle, signUp } from '@/features/auth/api';
import { CLSU_EMAIL_DOMAIN } from '@/lib/campus';

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      const normalized = normalizeHandle(handle);
      if (!isValidHandle(normalized)) {
        throw new Error('Handle must be 3–20 characters: letters, numbers or underscore.');
      }
      if (!(await isHandleAvailable(normalized))) {
        throw new Error(`@${normalized} is already taken.`);
      }
      await signUp({ email, password, displayName, handle: normalized });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  }

  const ready = displayName && handle && email && password;

  return (
    <ScreenScrollView contentContainerClassName="px-5 pt-24 gap-5">
      <View className="gap-1">
        <Text className="text-3xl font-semibold">Create account</Text>
        <Text className="text-muted-foreground">
          Anyone can join. Verify a {CLSU_EMAIL_DOMAIN} address to get the student badge.
        </Text>
      </View>

      <TextField>
        <TextFieldLabel>Display name</TextFieldLabel>
        <TextFieldInput value={displayName} onChangeText={setDisplayName} placeholder="Juan Dela Cruz" />
      </TextField>

      <TextField>
        <TextFieldLabel>Handle</TextFieldLabel>
        <TextFieldInput
          value={handle}
          onChangeText={setHandle}
          autoCapitalize="none"
          placeholder="juan_dc"
        />
        <TextFieldDescription>Your unique @name. Cannot be changed later.</TextFieldDescription>
      </TextField>

      <TextField>
        <TextFieldLabel>Email</TextFieldLabel>
        <TextFieldInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder={`you@${CLSU_EMAIL_DOMAIN}`}
        />
      </TextField>

      <TextField>
        <TextFieldLabel>Password</TextFieldLabel>
        <TextFieldInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        {error ? <TextFieldError>{error}</TextFieldError> : null}
      </TextField>

      <Button onPress={onSubmit} isDisabled={busy || !ready}>
        <Button.Label>{busy ? 'Creating…' : 'Create account'}</Button.Label>
      </Button>

      <View className="items-center">
        <Link href="/sign-in">
          <Text className="text-sm text-muted-foreground">I already have an account</Text>
        </Link>
      </View>
    </ScreenScrollView>
  );
}
