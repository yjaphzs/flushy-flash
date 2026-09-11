import { getApp } from '@react-native-firebase/app';
import { getAuth, connectAuthEmulator } from '@react-native-firebase/auth';
import { getFirestore, connectFirestoreEmulator } from '@react-native-firebase/firestore';
import { getStorage, connectStorageEmulator } from '@react-native-firebase/storage';
import { getDatabase, connectDatabaseEmulator } from '@react-native-firebase/database';

import { env } from '@/lib/env';

/**
 * React Native Firebase reads its project configuration from the native
 * google-services.json / GoogleService-Info.plist baked in at prebuild — there is
 * no initializeApp({ apiKey }) call and no env var for it. See src/lib/env.ts for
 * why, and for what genuinely is environment-driven.
 *
 * Those files are client configuration, not secrets; security rules and App Check
 * are the real boundary. They are kept out of this public repo anyway, because a
 * published API key gets scraped and abused for signup spam and quota burn.
 */
const app = getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

if (env.firebase.useEmulators) {
  const { host, ports } = env.firebase;

  // Must run before any read or write. Each connect* call is idempotent per
  // instance, but throws if the instance has already issued a request — which is
  // why this lives at module scope rather than inside a hook or effect.
  connectAuthEmulator(auth, `http://${host}:${ports.auth}`);
  connectFirestoreEmulator(db, host, ports.firestore);
  connectStorageEmulator(storage, host, ports.storage);
  connectDatabaseEmulator(rtdb, host, ports.database);

  // Loud on purpose: silently talking to an empty local backend looks exactly
  // like a broken app or a permissions bug.
  console.warn(`[firebase] Using LOCAL emulators at ${host} — not the real project.`);
}

export const COLLECTIONS = {
  buildings: 'buildings',
  restrooms: 'restrooms',
  reviews: 'reviews',
  users: 'users',
  handles: 'handles',
  follows: 'follows',
} as const;

/** Composite ids that let security rules enforce uniqueness without a query. */
export const reviewId = (restroomId: string, uid: string) => `${restroomId}_${uid}`;
export const followId = (followerId: string, followeeId: string) =>
  `${followerId}_${followeeId}`;
