import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/** Firestore rejects a batch over 500 writes. Matches purge-user.ts. */
const BATCH_LIMIT = 200;

/**
 * Everything that belongs to a restroom, removed after the restroom itself.
 *
 * ⚠️ **Deleting a restroom used to orphan all of it.** There was no cleanup
 * anywhere in this project: the document went and its photos stayed in Storage
 * for ever, along with its reviews — which then rendered against a restroom that
 * no longer existed. Nobody noticed because until now nothing could delete a
 * restroom at all; the rules permitted it and no client ever called it.
 *
 * Hung off `onDocumentDeleted` rather than called by each deleter, so the author
 * deleting their own entry and the scheduled purge of a hidden one share one
 * path. A future admin console gets it for free.
 *
 * Every step is idempotent — a retry deletes nothing twice — because the trigger
 * can be delivered more than once.
 */
export async function cleanupRestroom(restroomId: string): Promise<void> {
  const db = getFirestore();

  await deleteQuery(db.collection('reviews').where('restroomId', '==', restroomId));
  await deleteQuery(db.collection('restroomVotes').where('restroomId', '==', restroomId));
  await deleteQuery(db.collection('likes').where('restroomId', '==', restroomId));

  // Last, and best-effort: bytes with no document pointing at them cost storage
  // and nothing else, whereas a document pointing at bytes that are gone renders
  // as a broken image. Failing here must not undo the deletes above.
  await getStorage()
    .bucket()
    .deleteFiles({ prefix: `restrooms/${restroomId}/`, force: true });
}

async function deleteQuery(query: FirebaseFirestore.Query): Promise<void> {
  const db = getFirestore();
  const snap = await query.get();

  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const doc of snap.docs.slice(i, i + BATCH_LIMIT)) batch.delete(doc.ref);
    await batch.commit();
  }
}
