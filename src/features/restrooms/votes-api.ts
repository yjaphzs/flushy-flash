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

import { tokenVoteWeight } from '@/features/auth/api';
import { COLLECTIONS, db, voteId } from '@/lib/firebase';
import type { RestroomVote } from '@/lib/types';

export type VoteKind = 'confirm' | 'report';

/**
 * The signed-in user's votes.
 *
 * Scoped to `voterId == uid` because the rules scope votes to their owner —
 * unlike reviews, which are public. Knowing who reported an entry as fake is the
 * beginning of retaliation on a campus where a handle is a name, so only the
 * aggregate on the restroom is public. A query without this filter is not merely
 * empty, it is refused.
 */
export function subscribeToMyVotes(
  uid: string,
  onChange: (votes: RestroomVote[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.restroomVotes),
      where('voterId', '==', uid),
      orderBy('createdAt', 'desc'),
    ),
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RestroomVote));
    },
    onError,
  );
}

/**
 * Casting a vote is a create at a composite id; withdrawing it is a delete.
 *
 * There is no update path and the rules refuse one, exactly as they do for
 * likes. **Changing your mind is therefore a delete and then a create**, which
 * is what `castVote` does below — an editable vote would let `byStudent` be
 * re-evaluated against a token that has since changed, and it would make
 * one-vote-per-user a property of validation rather than of the key.
 *
 * The weight flags come from the TOKEN rather than the auth store. The rules
 * demand they equal `isVerifiedStudent()` / `isAdmin()`, so a value guessed from
 * the store is a flat `permission-denied` with no clue which clause failed.
 */
export async function castVote(uid: string, restroomId: string, kind: VoteKind) {
  const ref = doc(db, COLLECTIONS.restroomVotes, voteId(restroomId, uid));
  const { byStudent, byAdmin } = await tokenVoteWeight();

  // Delete first. setDoc on an existing document is an UPDATE as far as the
  // rules are concerned, and update is denied outright — so switching from
  // confirm to report without this fails rather than flipping.
  await deleteDoc(ref).catch(() => {
    // Nothing to withdraw: this is the common case, a first vote.
  });

  await setDoc(ref, {
    restroomId,
    voterId: uid,
    kind,
    byStudent,
    byAdmin,
    createdAt: serverTimestamp(),
  });
}

export function withdrawVote(uid: string, restroomId: string) {
  return deleteDoc(doc(db, COLLECTIONS.restroomVotes, voteId(restroomId, uid)));
}
