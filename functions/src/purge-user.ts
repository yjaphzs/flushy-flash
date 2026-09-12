import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

import { anonName } from './anon-names';

/**
 * Deleting an account, keeping what it contributed.
 *
 * The campus map is shared data: a restroom someone added is relied on by
 * everyone who walks past it, and deleting the account should not delete the
 * pin. So contributions are RE-KEYED to an anonymous id rather than removed,
 * and everything that identifies the person goes.
 *
 * ## Why this runs with admin credentials
 *
 * None of it is possible from a client, and not by omission —
 * `firestore.rules` denies each step deliberately:
 *
 *   - `users/{uid}` and `handles/{handle}` are `allow delete: if isAdmin()`.
 *   - `restrooms.createdBy` and `reviews.authorId` are in `unchanged([...])`.
 *
 * Loosening any of those to let a client do this would also let a client do it
 * to data that is not theirs, or leave an account half-deleted with no way to
 * finish. This function bypasses rules entirely, which is the point.
 *
 * ## Ordering
 *
 * Every step is idempotent and every intermediate state is coherent, because
 * this can die halfway and be retried. `auth.deleteUser` is LAST: while the
 * account exists the user can call again, and a failure before that point
 * leaves them with a working account rather than an orphaned one.
 */

/** Firestore rejects a batch over 500 writes; a re-key is 2 per review. */
const BATCH_LIMIT = 200;

export type PurgeResult = { anonId: string; reviews: number; restrooms: number };

export async function purgeUser(uid: string): Promise<PurgeResult> {
  const db = getFirestore();

  /**
   * The idempotency key, claimed first.
   *
   * A retry must reuse the SAME anonymous id, or a second run would mint a
   * second tombstone and split the user's contributions across two ghosts.
   * `deletions` is denied to every client for free by the catch-all
   * `match /{document=**} { allow read, write: if false; }` at the end of
   * firestore.rules — no new rule needed.
   */
  const ledger = db.collection('deletions').doc(uid);
  const existing = await ledger.get();
  const anonId: string =
    existing.exists && typeof existing.data()?.anonId === 'string'
      ? (existing.data()!.anonId as string)
      : `anon_${db.collection('_').doc().id}`;

  await ledger.set(
    { uid, anonId, status: 'running', startedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );

  const profile = await db.collection('users').doc(uid).get();
  const handle = profile.exists ? (profile.data()?.handle as string | undefined) : undefined;

  // 1. The tombstone. Created before anything points at it, so a crash here
  //    leaves an orphan nobody references rather than dangling authorIds.
  //
  //    It lives at users/{anonId} so the review card's existing
  //    authorId -> users/{authorId} join keeps working with no read-path
  //    change. It is unwritable by any client BY CONSTRUCTION: isSelf() can
  //    never match an anon_ id, and hasOnly(userKeys()) rejects the `deleted`
  //    and `deletedAt` fields with no new clause.
  await db
    .collection('users')
    .doc(anonId)
    .set({
      handle: null,
      displayName: anonName(anonId),
      photoURL: null,
      verifiedStudent: false,
      reviewCount: 0,
      followerCount: 0,
      followingCount: 0,
      deleted: true,
      deletedAt: FieldValue.serverTimestamp(),
      createdAt: profile.data()?.createdAt ?? FieldValue.serverTimestamp(),
    });

  // 2. Reviews are RE-KEYED, not edited. The document id is
  //    `${restroomId}_${uid}` — the uid is in the KEY — so nulling authorId
  //    would leave it recoverable by anyone reading the path. Re-keying to
  //    `${restroomId}_${anonId}` genuinely removes it, and preserves the
  //    one-review-per-user invariant the composite id exists to enforce.
  const reviews = await reKeyReviews(uid, anonId);

  // 3. Restrooms keep their pin and lose their author.
  const restrooms = await reassign('restrooms', 'createdBy', uid, anonId);

  // 4. Storage metadata: the uid must not survive in an object's uploadedBy.
  await reassignPhotoOwners(uid, anonId);

  // 5. Behavioural data has no public purpose and simply goes.
  await deleteWhere('likes', 'userId', uid);
  await deleteWhere('follows', 'followerId', uid);
  await deleteWhere('follows', 'followeeId', uid);

  // 6. Avatar objects, then the private subtree, then the profile.
  await deleteStoragePrefix(`users/${uid}/`);
  await db.recursiveDelete(db.collection('users').doc(uid));

  // 7. The handle is FREED, not tombstoned. It is usually the student's own
  //    name, so keeping it reserved would retain exactly the identifier the
  //    deletion was asked to sever — and the namespace is scarce on one campus.
  //    `handles` has `allow update: if false` and create only matches a
  //    non-existent document, so deleting it makes it legitimately claimable.
  if (handle) await db.collection('handles').doc(handle).delete();

  // 8. Last. Everything above is retryable while the account still exists.
  await getAuth()
    .deleteUser(uid)
    .catch((e: { code?: string }) => {
      if (e.code !== 'auth/user-not-found') throw e;
    });

  await ledger.set(
    { status: 'done', finishedAt: FieldValue.serverTimestamp(), reviews, restrooms },
    { merge: true },
  );

  return { anonId, reviews, restrooms };
}

/** set(new) + delete(old) per review, in one batch each, chunked. */
async function reKeyReviews(uid: string, anonId: string): Promise<number> {
  const db = getFirestore();
  const snap = await db.collection('reviews').where('authorId', '==', uid).get();
  let n = 0;

  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const doc of snap.docs.slice(i, i + BATCH_LIMIT)) {
      const data = doc.data();
      const restroomId = data.restroomId as string;
      batch.set(db.collection('reviews').doc(`${restroomId}_${anonId}`), {
        ...data,
        authorId: anonId,
      });
      batch.delete(doc.ref);
      n++;
    }
    await batch.commit();
  }
  return n;
}

async function reassign(
  collection: string,
  field: string,
  uid: string,
  anonId: string,
): Promise<number> {
  const db = getFirestore();
  const snap = await db.collection(collection).where(field, '==', uid).get();

  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const doc of snap.docs.slice(i, i + BATCH_LIMIT)) {
      batch.update(doc.ref, { [field]: anonId });
    }
    await batch.commit();
  }
  return snap.size;
}

async function deleteWhere(collection: string, field: string, uid: string): Promise<void> {
  const db = getFirestore();
  const snap = await db.collection(collection).where(field, '==', uid).get();

  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const doc of snap.docs.slice(i, i + BATCH_LIMIT)) batch.delete(doc.ref);
    await batch.commit();
  }
}

/**
 * Rewrites `uploadedBy` on kept photos.
 *
 * A consequence worth stating: `storage.rules` gates deletion on
 * `resource.metadata.uploadedBy == request.auth.uid`, which can never match an
 * `anon_` value — so these objects become admin-only from here. That is correct.
 * Kept content is moderated content.
 */
async function reassignPhotoOwners(uid: string, anonId: string): Promise<void> {
  const [files] = await getStorage().bucket().getFiles({ prefix: 'restrooms/' });
  await Promise.all(
    files
      .filter((f) => f.metadata.metadata?.uploadedBy === uid)
      .map((f) => f.setMetadata({ metadata: { uploadedBy: anonId } })),
  );
}

async function deleteStoragePrefix(prefix: string): Promise<void> {
  await getStorage().bucket().deleteFiles({ prefix, force: true });
}
