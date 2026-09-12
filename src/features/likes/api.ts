import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from '@react-native-firebase/firestore';

import { COLLECTIONS, db, likeId } from '@/lib/firebase';
import type { Like } from '@/lib/types';

/**
 * The signed-in user's saved restrooms.
 *
 * Scoped to `userId == uid` because firestore.rules scopes likes to their owner
 * — saved lists are private, unlike restrooms and reviews. A query without this
 * filter is not merely empty, it is refused.
 */
export function subscribeToMyLikes(
  uid: string,
  onChange: (likes: Like[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.likes),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
    ),
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Like));
    },
    onError,
  );
}

/**
 * Liking is a create at a composite id, unliking is a delete — there is no
 * update path, and the rules refuse one. That is what keeps "one like per user
 * per restroom" structural rather than something a query has to police.
 */
export function likeRestroom(uid: string, restroomId: string) {
  return setDoc(doc(db, COLLECTIONS.likes, likeId(uid, restroomId)), {
    userId: uid,
    restroomId,
    createdAt: serverTimestamp(),
  });
}

export function unlikeRestroom(uid: string, restroomId: string) {
  return deleteDoc(doc(db, COLLECTIONS.likes, likeId(uid, restroomId)));
}
