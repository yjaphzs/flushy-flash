import { useRef } from 'react';
import { Link, router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/feedback/callout';
import { Field, type TextInputHandle } from '@/components/forms/field';
import { LabeledSeparator } from '@/components/ui/separator';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { AuthScreen } from '@/features/auth/components/auth-screen';
import { CLSU_PRIMARY_DOMAIN } from '@/lib/campus';
import { GoogleButton } from '@/features/auth/components/google-button';
import { isGoogleSignInConfigured } from '@/features/auth/google';
import { useSignInForm } from '@/features/auth/use-sign-in-form';

export default function SignInScreen() {
  const passwordRef = useRef<TextInputHandle>(null);
  const form = useSignInForm();

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to keep finding the good ones."
      onBack={router.canGoBack() ? () => router.back() : undefined}
      testID="sign-in-screen"
    >
      {form.formError ? (
        <Callout tone="danger" testID="sign-in-error">
          <Text type="body-sm">{form.formError}</Text>
        </Callout>
      ) : null}

      <View className="gap-4">
        <Field isInvalid={Boolean(form.emailError)}>
          <Field.Label>Email</Field.Label>
          <Field.Input
            value={form.email}
            onChangeText={form.setEmail}
            onBlur={() => form.touch('email')}
            leading="mail"
            placeholder={`you@${CLSU_PRIMARY_DOMAIN}`}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            testID="sign-in-email"
          />
          {form.emailError ? <Field.Error>{form.emailError}</Field.Error> : null}
        </Field>

        <Field isInvalid={Boolean(form.passwordError)}>
          <Field.Label>Password</Field.Label>
          <Field.PasswordInput
            ref={passwordRef}
            value={form.password}
            onChangeText={form.setPassword}
            onBlur={() => form.touch('password')}
            placeholder="Your password"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={form.submit}
            testID="sign-in-password"
          />
          {form.passwordError ? <Field.Error>{form.passwordError}</Field.Error> : null}
        </Field>

        <View className="items-end">
          <Pressable
            onPress={() =>
              // Carry the typed address across so it does not have to be retyped.
              router.push({
                pathname: '/forgot-password',
                params: { email: form.email },
              })
            }
            accessibilityRole="link"
            accessibilityLabel="Forgot your password?"
            hitSlop={12}
          >
            <Text type="body-sm" weight="medium" className="text-link">
              Forgot password?
            </Text>
          </Pressable>
        </View>
      </View>

      <Button
        size="lg"
        className="rounded-full"
        onPress={form.submit}
        isDisabled={form.busy || !form.ready}
      >
        {form.busy ? <Spinner size="sm" /> : null}
        <Button.Label>{form.busy ? 'Signing in…' : 'Sign in'}</Button.Label>
      </Button>

      {isGoogleSignInConfigured() ? (
        <>
          <LabeledSeparator label="Or continue with" />
          <GoogleButton
            onPress={form.submitGoogle}
            isDisabled={form.busy}
            testID="sign-in-google"
          />
        </>
      ) : null}

      <View className="flex-row items-center justify-center gap-1">
        <Text type="body-sm" color="muted">
          New here?
        </Text>
        <Link href="/sign-up" asChild>
          <Pressable hitSlop={12} accessibilityRole="link" accessibilityLabel="Create an account">
            <Text type="body-sm" weight="semibold" className="text-link">
              Create an account
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthScreen>
  );
}
