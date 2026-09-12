import { renderWithProviders as render, screen, userEvent } from '@/test-utils/render';

import SignInScreen from '@/app/(auth)/sign-in';
import { signIn } from '@/features/auth/api';

/**
 * Screen tests live here rather than beside the route on purpose: expo-router's
 * `require.context` regex (see node_modules/expo-router/_ctx.android.js) has no
 * test-file exclusion, so `sign-in.test.tsx` under src/app/ would register
 * itself as a navigable route.
 */
// A factory, not automock: automock still loads the real module to derive its
// shape, which pulls in @react-native-firebase and its nested copy of the
// Firebase JS SDK. A unit test of this screen has no business doing that.
jest.mock('@/features/auth/api', () => ({ signIn: jest.fn() }));
// Mocked rather than leaning on the package's own jest setup: this keeps the
// native TurboModule out of the test entirely, and lets each test decide whether
// the Google button renders at all.
jest.mock('@/features/auth/google', () => ({
  isGoogleSignInConfigured: () => false,
  signInWithGoogle: jest.fn(),
  signOutGoogle: jest.fn(),
  GoogleSignInCancelled: class extends Error {},
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const mockSignIn = jest.mocked(signIn);

beforeEach(() => jest.clearAllMocks());

describe('SignInScreen', () => {
  it('keeps the CTA disabled until both fields are usable', async () => {
    const user = userEvent.setup();
    await render(<SignInScreen />);

    const cta = screen.getByRole('button', { name: /sign in/i });
    expect(cta).toBeDisabled();

    await user.type(screen.getByTestId('sign-in-email'), 'juan@clsu.edu.ph');
    expect(cta).toBeDisabled();

    await user.type(screen.getByTestId('sign-in-password'), 'hunter2!');
    expect(cta).toBeEnabled();
  });

  it('submits the typed credentials', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue(undefined as never);
    await render(<SignInScreen />);

    await user.type(screen.getByTestId('sign-in-email'), 'juan@clsu.edu.ph');
    await user.type(screen.getByTestId('sign-in-password'), 'hunter2!');
    await user.press(screen.getByRole('button', { name: /sign in/i }));

    expect(mockSignIn).toHaveBeenCalledWith('juan@clsu.edu.ph', 'hunter2!');
  });

  it('shows a submit failure at form level, not inside the password field', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValue(
      Object.assign(new Error('[auth/wrong-password] nope'), { code: 'auth/wrong-password' }),
    );
    await render(<SignInScreen />);

    await user.type(screen.getByTestId('sign-in-email'), 'juan@clsu.edu.ph');
    await user.type(screen.getByTestId('sign-in-password'), 'wrong');
    await user.press(screen.getByRole('button', { name: /sign in/i }));

    // Regression lock: this used to render inside the password TextField, which
    // blamed the wrong control and left the field itself un-highlighted.
    const error = await screen.findByTestId('sign-in-error');
    expect(error).toHaveTextContent('Email or password is incorrect.');
  });

  it('never navigates on success — the auth guard swaps the tree', async () => {
    const user = userEvent.setup();
    const { router } = jest.requireMock('expo-router');
    mockSignIn.mockResolvedValue(undefined as never);
    await render(<SignInScreen />);

    await user.type(screen.getByTestId('sign-in-email'), 'juan@clsu.edu.ph');
    await user.type(screen.getByTestId('sign-in-password'), 'hunter2!');
    await user.press(screen.getByRole('button', { name: /sign in/i }));

    // AGENTS.md §8. Navigating here would reintroduce the redirect flash that
    // Stack.Protected exists to prevent.
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('toggles password visibility without losing the value', async () => {
    const user = userEvent.setup();
    await render(<SignInScreen />);

    const field = screen.getByTestId('sign-in-password');
    await user.type(field, 'hunter2!');
    expect(field.props.secureTextEntry).toBe(true);

    await user.press(screen.getByRole('button', { name: 'Show password' }));
    expect(field.props.secureTextEntry).toBe(false);
    expect(field.props.value).toBe('hunter2!');

    await user.press(screen.getByRole('button', { name: 'Hide password' }));
    expect(field.props.secureTextEntry).toBe(true);
  });
});
