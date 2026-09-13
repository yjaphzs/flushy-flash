import { create } from 'zustand';
import type { User } from '@react-native-firebase/auth';
import { isCampusEmail } from '@/lib/campus';

/**
 * The app is guest-first: everyone gets the map, and an account is only needed
 * to contribute. So "signed out" is a normal operating state, not an error, and
 * there are three degrees of *partly* signed in between it and a usable account.
 *
 * - `guest`             no account at all. Browses everything, writes nothing.
 * - `needsVerification` email/password account whose address is unconfirmed.
 *                       Still browses — trapping someone on a dead-end screen
 *                       because a verification mail was slow is worse than the
 *                       inconsistency of letting them look around.
 * - `needsProfile`      verified (or Google, which arrives verified) but with no
 *                       users/{uid} yet. firestore.rules requires a handle to
 *                       create that document, and Google supplies none.
 * - `signedIn`          verified + profile. The only state that may write.
 *
 * `loading` and `checking` are the two states that hold the native splash:
 * `loading` while Firebase restores a session, `checking` while we read
 * users/{uid} to tell `signedIn` from `needsProfile`. Rendering during either
 * would flash a screen the user is about to be moved off.
 */
export type AuthStatus =
  | 'loading'
  | 'checking'
  | 'guest'
  | 'needsVerification'
  | 'needsProfile'
  | 'signedIn';

/** Statuses we can actually render from — i.e. where the splash may hide. */
const SETTLED: readonly AuthStatus[] = ['guest', 'needsVerification', 'needsProfile', 'signedIn'];

type AuthState = {
  status: AuthStatus;
  /**
   * Monotonic: true once the FIRST cold-start decision lands, never false again.
   *
   * This exists instead of testing `status === 'loading' || 'checking'` because
   * `checking` is re-entered MID-SESSION — a guest signing in with Google passes
   * through it. Holding the splash on `checking` would unmount the whole running
   * app after the splash had already been hidden, blanking the map the user was
   * looking at. Hydration happens once; auth state changes many times.
   */
  hydrated: boolean;
  uid: string | null;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  /** The profile's @handle once known; null while absent or unread. */
  handle: string | null;
  /** Whether users/{uid} is known to exist. This, not `handle`, gates routing. */
  hasProfile: boolean;
  setUser: (user: User | null) => void;
  /**
   * Called once the users/{uid} lookup settles, or optimistically right after
   * createProfile's batch commits. `null` means the document does not exist.
   */
  setProfile: (uid: string, profile: { handle: string } | null) => void;
};

const GUEST = {
  status: 'guest',
  uid: null,
  email: null,
  displayName: null,
  photoURL: null,
  emailVerified: false,
  handle: null,
  hasProfile: false,
} as const;

/**
 * Whether this account signs in with a password rather than a federated
 * provider. Exported because the delete flow branches on it: a password user
 * must re-enter their password, a Google user just confirms.
 */
export function usesPassword(user: User) {
  return user.providerData.some((p) => p.providerId === 'password');
}

/**
 * Decides as much as possible from the token alone, so `checking` — the only
 * status that costs a Firestore read — is entered as rarely as possible.
 *
 * The verification branch is limited to password accounts on purpose. Only a
 * password account can act on "confirm your email"; a federated account with an
 * unverified address has no password to reset and would be stranded there.
 * Google addresses arrive verified, so Google skips this with no special-casing.
 */
function statusForUser(user: User, knownProfile: boolean): AuthStatus {
  if (usesPassword(user) && !user.emailVerified) return 'needsVerification';
  return knownProfile ? 'signedIn' : 'checking';
}

export const useAuthStore = create<AuthState>((set) => ({
  ...GUEST,
  status: 'loading',
  hydrated: false,
  setUser: (user) =>
    set((state) => {
      if (!user) return { ...GUEST, hydrated: true };

      // Carry what we already know across a token refresh, so a change to
      // emailVerified does not bounce an established user back through
      // `checking` and pay for a redundant read.
      const sameUser = state.uid === user.uid;
      const knownProfile = sameUser && state.hasProfile;
      const status = statusForUser(user, knownProfile);

      return {
        status,
        hydrated: state.hydrated || SETTLED.includes(status),
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        handle: sameUser ? state.handle : null,
        hasProfile: knownProfile,
      };
    }),
  setProfile: (uid, profile) =>
    set((state) => {
      // Ignore a result for an account we have since moved off — and never let
      // a late read promote an account whose address is still unconfirmed, which
      // would hand write access to an unverified user.
      if (state.uid !== uid || state.status === 'needsVerification') return state;
      return {
        handle: profile?.handle ?? null,
        hasProfile: profile !== null,
        status: profile ? 'signedIn' : 'needsProfile',
        hydrated: true,
      };
    }),
}));

/**
 * Selector hooks: components subscribe to a primitive rather than the whole
 * store, so an unrelated field changing doesn't re-render them.
 */
export const useAuthStatus = () => useAuthStore((s) => s.status);
export const useUid = () => useAuthStore((s) => s.uid);
export const useHandle = () => useAuthStore((s) => s.handle);

/**
 * The single question every write surface asks. Anything that creates or edits
 * shared data — the add-restroom FAB, the review composer, the like button —
 * gates on this rather than on `uid`, because having a uid is no longer the same
 * as having a usable account.
 *
 * Mirrored server-side by hasProfile() in firestore.rules. The client copy is a
 * UX affordance; the rules are the boundary.
 */
export const useCanWrite = () => useAuthStore((s) => s.status === 'signedIn');

/** True once the first cold-start decision has landed. Holds the splash. */
export const useAuthHydrated = () => useAuthStore((s) => s.hydrated);

/** Imperative twin of useCanWrite, for handlers that must not subscribe. */
export const canWriteNow = () => useAuthStore.getState().status === 'signedIn';

/**
 * Client-side hint only. The authoritative check lives in firestore.rules against
 * the auth token's own claims — a client cannot grant itself the badge by
 * flipping this.
 */
export const useIsVerifiedStudent = () =>
  useAuthStore(
    (s) => s.emailVerified && isCampusEmail(s.email),
  );
