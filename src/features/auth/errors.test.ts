import { authErrorMessage, isAccountNotFound, isEmailish } from './errors';

/** RNFirebase throws Error objects carrying a `code`; the message repeats it. */
function fbError(code: string, message = 'Developer-facing text.') {
  return Object.assign(new Error(`[${code}] ${message}`), { code });
}

describe('authErrorMessage', () => {
  it('collapses every credential failure into one message', () => {
    // Account enumeration guard: if these three differed, an attacker could
    // learn which email addresses have accounts by reading the error.
    const messages = [
      authErrorMessage(fbError('auth/wrong-password'), 'sign-in'),
      authErrorMessage(fbError('auth/user-not-found'), 'sign-in'),
      authErrorMessage(fbError('auth/invalid-credential'), 'sign-in'),
    ];

    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toBe('Email or password is incorrect.');
  });

  it('reads the code from the message when there is no code property', () => {
    const bare = new Error('[auth/too-many-requests] Too many attempts.');
    expect(authErrorMessage(bare, 'sign-in')).toBe(
      'Too many attempts. Wait a minute and try again.',
    );
  });

  it('never leaks the bracketed code into user-facing copy', () => {
    expect(authErrorMessage(fbError('auth/weak-password'), 'sign-up')).not.toContain('[');
  });

  it('passes through our own validation messages unchanged', () => {
    expect(authErrorMessage(new Error('@juan is already taken.'), 'sign-up')).toBe(
      '@juan is already taken.',
    );
  });

  it('falls back per context for an unrecognised failure', () => {
    expect(authErrorMessage(fbError('auth/something-new'), 'reset')).toBe(
      'Could not send the reset email. Please try again.',
    );
    expect(authErrorMessage({}, 'sign-in')).toBe('Could not sign you in. Please try again.');
  });
});

describe('isAccountNotFound', () => {
  it('identifies the case the reset screen routes into success', () => {
    expect(isAccountNotFound(fbError('auth/user-not-found'))).toBe(true);
    expect(isAccountNotFound(fbError('auth/wrong-password'))).toBe(false);
  });
});

describe('isEmailish', () => {
  it.each(['a@b.co', 'juan.dela.cruz@clsu.edu.ph', ' padded@example.com '])(
    'accepts %p',
    (value) => expect(isEmailish(value)).toBe(true),
  );

  it.each(['', 'juan', 'juan@', '@clsu.edu.ph', 'juan@clsu', 'a b@c.co'])('rejects %p', (value) =>
    expect(isEmailish(value)).toBe(false),
  );
});
