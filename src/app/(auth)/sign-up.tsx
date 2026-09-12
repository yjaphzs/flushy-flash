import { useRef } from 'react';
import { Link, router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/feedback/callout';
import { Field, type TextInputHandle } from '@/components/forms/field';
import { Pressable } from '@/components/ui/pressable';
import { LabeledSeparator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { CampusDomain } from '@/components/common/email-text';
import { AuthScreen } from '@/features/auth/components/auth-screen';
import { GoogleButton } from '@/features/auth/components/google-button';
import { isGoogleSignInConfigured } from '@/features/auth/google';
import { PasswordStrength } from '@/features/auth/components/password-strength';
import { useSignUpForm } from '@/features/auth/use-sign-up-form';
import { CLSU_EMAIL_DOMAIN } from '@/lib/campus';

/**
 * Credentials only. The display name and @handle are asked for after the address
 * is confirmed, on (auth)/complete-profile — which is both a shorter form
 * here and the thing that makes `verifiedStudent` correct when the profile is
 * finally written (see signUp in features/auth/api.ts).
 */
export default function SignUpScreen() {
  const passwordRef = useRef<TextInputHandle>(null);
  const confirmRef = useRef<TextInputHandle>(null);
  const form = useSignUpForm();

  return (
    <AuthScreen
      title="Create your account"
      subtitle={
        <>
          Anyone can join. Verify a <CampusDomain /> address to get the student badge.
        </>
      }
      onBack={router.canGoBack() ? () => router.back() : undefined}
      testID="sign-up-screen"
    >
      {form.formError ? (
        <Callout tone="danger" testID="sign-up-error">
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
            placeholder={`you@${CLSU_EMAIL_DOMAIN}`}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            testID="sign-up-email"
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
            placeholder="At least 8 characters"
            autoComplete="new-password"
            textContentType="newPassword"
            passwordRules="minlength: 8;"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => confirmRef.current?.focus()}
            testID="sign-up-password"
          />
          {form.passwordError ? <Field.Error>{form.passwordError}</Field.Error> : null}
          {form.password.length > 0 ? <PasswordStrength score={form.score} /> : null}
        </Field>

        <Field isInvalid={Boolean(form.confirmError)}>
          <Field.Label>Confirm password</Field.Label>
          <Field.PasswordInput
            ref={confirmRef}
            value={form.confirm}
            onChangeText={form.setConfirm}
            onBlur={() => form.touch('confirm')}
            placeholder="Type it again"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={form.submit}
            testID="sign-up-confirm"
          />
          {form.confirmError ? <Field.Error>{form.confirmError}</Field.Error> : null}
        </Field>
      </View>

      <Button
        size="lg"
        className="rounded-full"
        onPress={form.submit}
        isDisabled={form.busy || !form.ready}
      >
        {form.busy ? <Spinner size="sm" /> : null}
        <Button.Label>{form.busy ? 'Creating account…' : 'Create account'}</Button.Label>
      </Button>

      {isGoogleSignInConfigured() ? (
        <>
          <LabeledSeparator label="Or continue with" />
          <GoogleButton
            onPress={form.submitGoogle}
            isDisabled={form.busy}
            testID="sign-up-google"
          />
        </>
      ) : null}

      <View className="flex-row items-center justify-center gap-1">
        <Text type="body-sm" color="muted">
          Already have an account?
        </Text>
        <Link href="/sign-in" asChild>
          <Pressable hitSlop={12} accessibilityRole="link" accessibilityLabel="Sign in">
            <Text type="body-sm" weight="semibold" className="text-link">
              Sign in
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthScreen>
  );
}
