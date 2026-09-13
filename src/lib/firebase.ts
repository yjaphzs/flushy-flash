import { getApp } from '@react-native-firebase/app';
import { getAuth, connectAuthEmulator } from '@react-native-firebase/auth';
import { getFirestore, connectFirestoreEmulator } from '@react-native-firebase/firestore';
import {
  getStorage,
  connectStorageEmulator,
  setMaxOperationRetryTime,
  setMaxUploadRetryTime,
} from '@react-native-firebase/storage';
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

/**
 * How long Storage keeps retrying before giving up.
 *
 * ⚠️ **The defaults are ten minutes and two minutes, and both are wrong for a
 * phone.** Firebase retries an upload for 600s and any other operation — which
 * includes `getDownloadURL` — for 120s. With no connection that is not an error
 * path, it is a hang: submitting a restroom sat on "Uploading photo 1 of 3…"
 * for ten minutes before saying anything at all, and `use-photo-url.ts`
 * resolves one operation PER PHOTO, so a map full of pins stalls that many
 * native operations at once.
 *
 * These numbers are chosen against a person's patience rather than a network
 * model: photos are resized to a 1600px longest edge before they get here
 * (`features/restrooms/photos.ts`), so a successful upload is a few hundred
 * kilobytes and seconds, not minutes. Anything past this is a connection that
 * is not coming back inside the attempt, and the honest move is to say so and
 * let them retry deliberately.
 *
 * Both are Android/iOS only in RNFirebase, which is every platform this app
 * ships to. `void` with a catch because they are async and nothing can be done
 * if the native module refuses — the defaults still apply, which is the old
 * behaviour rather than a new failure.
 */
const MAX_UPLOAD_RETRY_MS = 30_000;
const MAX_OPERATION_RETRY_MS = 15_000;

void setMaxUploadRetryTime(storage, MAX_UPLOAD_RETRY_MS).catch(() => {});
void setMaxOperationRetryTime(storage, MAX_OPERATION_RETRY_MS).catch(() => {});

export const COLLECTIONS = {
  buildings: 'buildings',
  restrooms: 'restrooms',
  reviews: 'reviews',
  users: 'users',
  handles: 'handles',
  follows: 'follows',
  likes: 'likes',
  restroomVotes: 'restroomVotes',
  notifications: 'notifications',
} as const;

/** Composite ids that let security rules enforce uniqueness without a query. */
export const reviewId = (restroomId: string, uid: string) => `${restroomId}_${uid}`;
export const followId = (followerId: string, followeeId: string) =>
  `${followerId}_${followeeId}`;
// Actor first, matching followId — a user's own likes read naturally this way.
export const likeId = (uid: string, restroomId: string) => `${uid}_${restroomId}`;
// Subject first, like reviewId and NOT like likeId: the question this answers
// most often is "how many people vouched for THIS restroom", and the rules
// reconstruct the id from incoming().restroomId to prove one vote per user.
export const voteId = (restroomId: string, uid: string) => `${restroomId}_${uid}`;
