import { useState } from 'react';

import { signUp } from '@/features/auth/api';
import { authErrorMessage, isEmailish } from '@/features/auth/errors';
import { MIN_PASSWORD_LENGTH, scorePassword } from '@/features/auth/password';
import { useGoogleSignIn } from '@/features/auth/use-google-sign-in';

/**
 * Sign-up is now credentials only — email, password, confirm.
 *
 * The display name and @handle moved to the profile step, which runs after the
 * address is confirmed. That is not just pacing: firestore.rules requires
 * `verifiedStudent == isVerifiedStudent()`, so a profile written at signup was
 * stamped `false` against an unverified token and had no legal path back to
 * `true` afterwards. Creating it post-verification makes the field correct from
 * birth, and shortens this form to three fields as a side effect.
 */
export function useSignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const google = useGoogleSignIn('sign-up');

  const score = scorePassword(password);

  const emailError = touched.email && !isEmailish(email) ? 'Enter a valid email address.' : null;
  const passwordError =
    touched.password && password.length > 0 && !score.meetsMinimum
      ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
      : null;
  const confirmError =
    touched.confirm && confirm.length > 0 && confirm !== password ? 'Passwords do not match.' : null;

  const ready = isEmailish(email) && score.meetsMinimum && confirm === password;

  function touch(field: string) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  /**
   * No navigation on success. `signUp` creates the account, `onAuthStateChanged`
   * reports an unverified user, the store moves to `needsVerification`, and the
   * guard swaps in the verify screen (AGENTS.md §8).
   */
  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    setFormError(null);
    try {
      await signUp({ email, password });
    } catch (e) {
      setFormError(authErrorMessage(e, 'sign-up'));
    } finally {
      setBusy(false);
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirm,
    setConfirm,
    score,
    emailError,
    passwordError,
    confirmError,
    // One error slot and one busy flag, whichever path produced them.
    formError: formError ?? google.error,
    busy: busy || google.busy,
    submitGoogle: google.submit,
    ready,
    touch,
    submit,
  };
}
