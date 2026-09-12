import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/feedback/callout';
import { Field, type TextInputHandle } from '@/components/forms/field';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import {
  createProfile,
  isHandleAvailable,
  isValidHandle,
  normalizeHandle,
  signOut,
} from '@/features/auth/api';
import { AuthScreen } from '@/features/auth/components/auth-screen';
import { HandleField } from '@/features/auth/components/handle-field';
import { authErrorMessage } from '@/features/auth/errors';
import { useHandleAvailability } from '@/features/auth/use-handle-availability';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Where a first-time Google user picks the one thing Google cannot give us.
 *
 * Google supplies a display name and photo, so this asks for as little as the
 * rules allow: a handle, with the name pre-filled and editable. On success
 * `createProfile` writes the profile/handle pair and pushes it into the store,
 * and the root guard swaps the tree — no navigation from here.
 */
export default function CompleteProfileScreen() {
  const googleName = useAuthStore((s) => s.displayName);
  const handleRef = useRef<TextInputHandle>(null);

  const [displayName, setDisplayName] = useState(googleName ?? '');
  const [handleInput, setHandleInput] = useState('');
  const [handleTouched, setHandleTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleRaw = handleTouched ? handleInput : normalizeHandle(displayName);
  const { state: handleState, normalized: handle } = useHandleAvailability(handleRaw);

  const ready =
    displayName.trim().length > 0 && isValidHandle(handle) && handleState !== 'taken' && !busy;

  async function onSubmit() {
    if (!ready) return;
    setBusy(true);
    setFormError(null);
    try {
      if (!(await isHandleAvailable(handle))) throw new Error(`@${handle} is already taken.`);
      await createProfile({ displayName: displayName.trim(), handle });
    } catch (e) {
      setFormError(authErrorMessage(e, 'sign-up'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      title="Almost there"
      subtitle="Pick the @name other students will see on your reviews."
      testID="complete-profile-screen"
    >
      {formError ? (
        <Callout tone="danger" testID="complete-profile-error">
          <Text type="body-sm">{formError}</Text>
        </Callout>
      ) : null}

      <View className="gap-4">
        <Field>
          <Field.Label>Display name</Field.Label>
          <Field.Input
            value={displayName}
            onChangeText={setDisplayName}
            leading="user"
            placeholder="Juan Dela Cruz"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            maxLength={60}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => handleRef.current?.focus()}
            testID="complete-profile-name"
          />
        </Field>

        <HandleField
          value={handleRaw}
          onChangeText={(next) => {
            setHandleTouched(true);
            setHandleInput(next);
          }}
          ref={handleRef}
          onBlur={() => setHandleTouched(true)}
          state={handleState}
          testID="complete-profile-handle"
        />
      </View>

      <Button size="lg" className="rounded-full" onPress={onSubmit} isDisabled={!ready}>
        {busy ? <Spinner size="sm" /> : null}
        <Button.Label>{busy ? 'Setting up…' : 'Finish setting up'}</Button.Label>
      </Button>

      <View className="items-center">
        <Pressable
          onPress={() => signOut()}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          hitSlop={12}
          className="h-11 items-center justify-center"
        >
          <Text type="body-sm" color="muted">
            Use a different account
          </Text>
        </Pressable>
      </View>
    </AuthScreen>
  );
}
