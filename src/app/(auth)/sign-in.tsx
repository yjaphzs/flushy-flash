import { useState } from 'react';
import { Link } from 'expo-router';

import { Button } from '@/components/button';
import { ScreenScrollView } from '@/components/screen';
import { Text } from '@/components/text';
import { View } from '@/components/view';
import {
  TextField,
  TextFieldError,
  TextFieldInput,
  TextFieldLabel,
} from '@/components/text-field';
import { signIn } from '@/features/auth/api';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // No navigation here on purpose: onAuthStateChanged updates the store and the
  // root layout's guard swaps the whole tree.
  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenScrollView contentContainerClassName="px-5 pt-24 gap-5">
      <View className="gap-1">
        <Text className="text-3xl font-semibold">Flushy Flash</Text>
        <Text className="text-muted-foreground">Find a decent restroom on campus.</Text>
      </View>

      <TextField>
        <TextFieldLabel>Email</TextFieldLabel>
        <TextFieldInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@clsu.edu.ph"
        />
      </TextField>

      <TextField>
        <TextFieldLabel>Password</TextFieldLabel>
        <TextFieldInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          placeholder="Your password"
        />
        {error ? <TextFieldError>{error}</TextFieldError> : null}
      </TextField>

      <Button onPress={onSubmit} isDisabled={busy || !email || !password}>
        <Button.Label>{busy ? 'Signing in…' : 'Sign in'}</Button.Label>
      </Button>

      <View className="gap-2 items-center">
        <Link href="/forgot-password">
          <Text className="text-sm text-muted-foreground">Forgot your password?</Text>
        </Link>
        <Link href="/sign-up">
          <Text className="text-sm">Create an account</Text>
        </Link>
      </View>
    </ScreenScrollView>
  );
}
