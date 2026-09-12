import { getFirestore } from 'firebase-admin/firestore';

/**
 * Recomputes a restroom's `ratingSum` / `ratingCount` from its reviews.
 *
 * ⚠️ **This RECOMPUTES rather than applying a delta, and that is deliberate.**
 * A delta is cheaper and wrong in two ways that are both silent and permanent:
 *
 * - **Cloud Functions deliver at least once.** A retried invocation applies the
 *   same delta twice, and nothing ever corrects it — the aggregate is simply
 *   wrong from then on, on a surface (the map pin) where there is no second
 *   source to contradict it.
 * - **A dropped event is unrecoverable.** With recomputation the very next
 *   review on that restroom heals the number; with deltas the drift compounds.
 *
 * The cost is one query per review write, over the reviews of ONE restroom.
 * That is the same trade AGENTS.md §6 already makes for the whole app: scoped
 * to one campus, the clever version is pure cost.
 *
 * Both reads happen before the write because Firestore requires every read in a
 * transaction to precede every write, and `tx.get(query)` is what makes two
 * concurrent reviews on the same restroom serialise instead of racing.
 *
 * Security rules do not apply here — the Admin SDK bypasses them — which is the
 * whole reason these fields can stay `allow write: if false` for clients (§7).
 */
export async function recomputeRating(restroomId: string): Promise<void> {
  const db = getFirestore();
  const restroomRef = db.collection('restrooms').doc(restroomId);

  await db.runTransaction(async (tx) => {
    const restroom = await tx.get(restroomRef);
    // The restroom is gone — its reviews are being cleaned up behind it, and
    // writing to a deleted document would resurrect it as a partial ghost.
    if (!restroom.exists) return;

    const reviews = await tx.get(db.collection('reviews').where('restroomId', '==', restroomId));

    let ratingSum = 0;
    for (const doc of reviews.docs) {
      const rating = doc.get('rating');
      // A non-numeric rating cannot reach here through the rules, but an
      // aggregate poisoned to NaN would render as "NaN" on every pin forever.
      if (typeof rating === 'number' && Number.isFinite(rating)) ratingSum += rating;
    }
    const ratingCount = reviews.size;

    // No-op writes still cost a write and still re-fire nothing useful; skipping
    // them also keeps `updatedAt`-style listeners quiet on the client.
    if (restroom.get('ratingSum') === ratingSum && restroom.get('ratingCount') === ratingCount) {
      return;
    }

    tx.update(restroomRef, { ratingSum, ratingCount });
  });
}

/**
 * Which restrooms a single review write affects.
 *
 * Normally exactly one. It is a SET because account deletion re-keys reviews —
 * `set(new id)` + `delete(old id)` — and although the rules pin `restroomId` on
 * update, deriving the answer from the data costs nothing and cannot go stale
 * if that ever changes.
 */
export function affectedRestrooms(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): string[] {
  const ids = new Set<string>();
  for (const data of [before, after]) {
    const id = data?.restroomId;
    if (typeof id === 'string' && id) ids.add(id);
  }
  return [...ids];
}
