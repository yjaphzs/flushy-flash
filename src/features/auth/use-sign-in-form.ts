import { useState } from 'react';

import { signIn } from '@/features/auth/api';
import { authErrorMessage, isEmailish } from '@/features/auth/errors';
import { useGoogleSignIn } from '@/features/auth/use-google-sign-in';

/**
 * Sign-in form state, kept out of the screen so the screen stays layout.
 *
 * Validation messages are gated on `touched` so a field does not turn red while
 * the user is still typing into it for the first time.
 */
export function useSignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const google = useGoogleSignIn('sign-in');

  const emailError = touched.email && !isEmailish(email) ? 'Enter a valid email address.' : null;
  const passwordError = touched.password && password.length === 0 ? 'Enter your password.' : null;
  const ready = isEmailish(email) && password.length > 0;

  function touch(field: 'email' | 'password') {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  /**
   * No navigation on success, on purpose: onAuthStateChanged updates the auth
   * store and the root layout's Stack.Protected guard swaps the whole tree.
   * Calling router.replace() here would reintroduce the redirect flash the
   * guard exists to prevent (AGENTS.md §8).
   */
  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    setFormError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setFormError(authErrorMessage(e, 'sign-in'));
    } finally {
      setBusy(false);
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    emailError,
    passwordError,
    // One error slot and one busy flag, whichever path produced them.
    formError: formError ?? google.error,
    busy: busy || google.busy,
    submitGoogle: google.submit,
    ready,
    touch,
    submit,
  };
}
