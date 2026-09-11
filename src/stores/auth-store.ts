import { create } from 'zustand';
import type { User } from '@react-native-firebase/auth';
import { CLSU_EMAIL_DOMAIN } from '@/lib/campus';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

type AuthState = {
  status: AuthStatus;
  uid: string | null;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  setUser: (user: User | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  uid: null,
  email: null,
  displayName: null,
  photoURL: null,
  emailVerified: false,
  setUser: (user) =>
    set(
      user
        ? {
            status: 'signedIn',
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
          }
        : {
            status: 'signedOut',
            uid: null,
            email: null,
            displayName: null,
            photoURL: null,
            emailVerified: false,
          },
    ),
}));

/**
 * Selector hooks: components subscribe to a primitive rather than the whole
 * store, so an unrelated field changing doesn't re-render them.
 */
export const useAuthStatus = () => useAuthStore((s) => s.status);
export const useUid = () => useAuthStore((s) => s.uid);

/**
 * Client-side hint only. The authoritative check lives in firestore.rules against
 * the auth token's own claims — a client cannot grant itself the badge by
 * flipping this.
 */
export const useIsVerifiedStudent = () =>
  useAuthStore(
    (s) => s.emailVerified && (s.email?.toLowerCase().endsWith(`@${CLSU_EMAIL_DOMAIN}`) ?? false),
  );
