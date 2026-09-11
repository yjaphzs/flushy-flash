import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';
import { getDatabase } from '@react-native-firebase/database';

/**
 * React Native Firebase reads its configuration from the native
 * google-services.json / GoogleService-Info.plist baked in at prebuild — there is
 * no initializeApp({ apiKey }) call and no env var. Those files are client
 * configuration, not secrets; security rules are the actual boundary.
 */
const app = getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

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
