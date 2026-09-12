import type { User } from '@react-native-firebase/auth';

import { useAuthStore } from './auth-store';

/**
 * The store imports only zustand, a type-only User and a string constant, so the
 * whole state machine is testable with fake user literals and never loads
 * @react-native-firebase.
 */
function fakeUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'u1',
    email: 'juan@clsu.edu.ph',
    emailVerified: false,
    displayName: null,
    photoURL: null,
    providerData: [{ providerId: 'password' }],
    ...overrides,
  } as unknown as User;
}

const initial = useAuthStore.getState();
beforeEach(() => useAuthStore.setState(initial, true));

describe('auth status machine', () => {
  it('starts held on the splash', () => {
    expect(useAuthStore.getState().status).toBe('loading');
    expect(useAuthStore.getState().hydrated).toBe(false);
  });

  it('settles a signed-out cold start straight to guest, with no Firestore read', () => {
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().status).toBe('guest');
    // The most important performance property of guest-first: no round trip.
    expect(useAuthStore.getState().hydrated).toBe(true);
  });

  it('sends an unconfirmed password account to needsVerification without a read', () => {
    useAuthStore.getState().setUser(fakeUser({ emailVerified: false }));
    expect(useAuthStore.getState().status).toBe('needsVerification');
    expect(useAuthStore.getState().hydrated).toBe(true);
  });

  it('sends a verified account with no profile to checking, then needsProfile', () => {
    useAuthStore.getState().setUser(fakeUser({ emailVerified: true }));
    expect(useAuthStore.getState().status).toBe('checking');

    useAuthStore.getState().setProfile('u1', null);
    expect(useAuthStore.getState().status).toBe('needsProfile');
  });

  it('reaches signedIn only with a profile', () => {
    useAuthStore.getState().setUser(fakeUser({ emailVerified: true }));
    useAuthStore.getState().setProfile('u1', { handle: 'juan' });

    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(useAuthStore.getState().handle).toBe('juan');
  });

  it('skips needsVerification for a federated account', () => {
    // Google addresses arrive verified; a provider with no password has no way
    // to act on "confirm your email" and must not be parked there.
    useAuthStore.getState().setUser(
      fakeUser({
        emailVerified: false,
        providerData: [{ providerId: 'google.com' }],
      } as Partial<User>),
    );
    expect(useAuthStore.getState().status).toBe('checking');
  });

  it('never re-holds the splash once hydrated', () => {
    useAuthStore.getState().setUser(null);
    // A guest signing in passes back through `checking` mid-session. Holding the
    // splash there would unmount the running app and blank the map.
    useAuthStore.getState().setUser(fakeUser({ uid: 'u2', emailVerified: true }));

    expect(useAuthStore.getState().status).toBe('checking');
    expect(useAuthStore.getState().hydrated).toBe(true);
  });

  it('keeps an established account signedIn across a token refresh', () => {
    useAuthStore.getState().setUser(fakeUser({ emailVerified: true }));
    useAuthStore.getState().setProfile('u1', { handle: 'juan' });
    useAuthStore.getState().setUser(fakeUser({ emailVerified: true }));

    // No bounce through `checking`, so no redundant Firestore read.
    expect(useAuthStore.getState().status).toBe('signedIn');
  });

  it('ignores a profile result for an account we have moved off', () => {
    useAuthStore.getState().setUser(fakeUser({ uid: 'u1', emailVerified: true }));
    useAuthStore.getState().setUser(fakeUser({ uid: 'u2', emailVerified: true }));
    useAuthStore.getState().setProfile('u1', { handle: 'stale' });

    expect(useAuthStore.getState().handle).toBeNull();
    expect(useAuthStore.getState().status).toBe('checking');
  });

  it('never promotes an unconfirmed account, even if a late read arrives', () => {
    useAuthStore.getState().setUser(fakeUser({ emailVerified: false }));
    useAuthStore.getState().setProfile('u1', { handle: 'juan' });

    // Otherwise a stale in-flight read would hand write access to someone whose
    // address was never confirmed.
    expect(useAuthStore.getState().status).toBe('needsVerification');
  });

  it('clears everything on sign-out but stays hydrated', () => {
    useAuthStore.getState().setUser(fakeUser({ emailVerified: true }));
    useAuthStore.getState().setProfile('u1', { handle: 'juan' });
    useAuthStore.getState().setUser(null);

    const s = useAuthStore.getState();
    expect(s.status).toBe('guest');
    expect(s.uid).toBeNull();
    expect(s.handle).toBeNull();
    expect(s.hasProfile).toBe(false);
    expect(s.hydrated).toBe(true);
  });
});
