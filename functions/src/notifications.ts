import { FieldValue, getFirestore } from 'firebase-admin/firestore';

/**
 * The inbox: who gets told what, and who is never named.
 *
 * ## ⚠️ Two kinds are ACTOR-LESS by law, not by omission
 *
 * `restroomVotes` is owner-scoped in `firestore.rules` for one stated reason —
 * learning who reported your entry is the beginning of retaliation, and on this
 * campus a handle identifies a person. A notification naming the voter would
 * re-open the exact leak that read rule closes, from a collection the client
 * cannot even query. So `confirmed` carries no `actorId`, ever.
 *
 * `review` names its actor, and that is consistent rather than inconsistent:
 * reviews are world-readable and already render an author chip on the restroom
 * page. The notification reveals nothing the review does not.
 *
 * A report produces NO notification at all. Three of them hide the restroom,
 * and `hidden` is the honest thing to send — telling an author each time
 * somebody doubts their entry is a way to make people stop contributing.
 *
 * ## ⚠️ "Someone saved your restroom" must never be added here
 *
 * `likes` is owner-scoped too, and the README promises there is no public
 * "saved by N students" count anywhere in the app.
 */

export type NotificationKind = 'review' | 'verified' | 'confirmed' | 'hidden';

export type NotificationItem = {
  /** Derived, never auto-generated — see `writeNotifications`. */
  id: string;
  /** The recipient: the restroom's author. */
  userId: string;
  kind: NotificationKind;
  /** Null on every kind but `review`. */
  actorId: string | null;
  restroomId: string;
  reviewId: string | null;
};

type Doc = Record<string, unknown> | undefined;

const str = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null;

/**
 * A review landing on someone else's restroom.
 *
 * ⚠️ Returns null when `before` exists. `onReviewWritten` is
 * `onDocumentWritten`, so it fires on edits and deletes too — and an edited
 * review is not news. Only the create is.
 *
 * ⚠️ Returns null for a self-review. The rules bar you from VOTING on your own
 * restroom (`firestore.rules` checks `createdBy != request.auth.uid`) but
 * nothing stops you reviewing it, so this is the only place that check exists.
 */
export function reviewNotification(
  before: Doc,
  after: Doc,
  reviewId: string,
  restroomOwner: string | null,
): NotificationItem | null {
  if (before !== undefined || after === undefined) return null;

  const authorId = str(after.authorId);
  const restroomId = str(after.restroomId);
  if (!authorId || !restroomId || !restroomOwner) return null;
  if (authorId === restroomOwner) return null;

  return {
    id: `rev_${reviewId}`,
    userId: restroomOwner,
    kind: 'review',
    actorId: authorId,
    restroomId,
    reviewId,
  };
}

/**
 * Somebody went and found the place.
 *
 * Only a created `confirm` — a report is deliberately silent (see the module
 * docblock), and a withdrawn vote is a delete, which is not news either.
 */
export function voteNotification(
  before: Doc,
  after: Doc,
  voteId: string,
  restroomOwner: string | null,
): NotificationItem | null {
  if (before !== undefined || after === undefined) return null;
  if (after.kind !== 'confirm') return null;

  const restroomId = str(after.restroomId);
  if (!restroomId || !restroomOwner) return null;
  // The rules already refuse a vote on your own restroom; belt and braces, and
  // it keeps this function honest on its own terms.
  if (str(after.voterId) === restroomOwner) return null;

  return {
    id: `con_${voteId}`,
    userId: restroomOwner,
    kind: 'confirmed',
    // Never the voter. See the module docblock.
    actorId: null,
    restroomId,
    reviewId: null,
  };
}

/**
 * The two edges worth telling an author about on their own restroom.
 *
 * ⚠️ Edges, not states. `onRestroomWritten` fires on every write — a rating
 * recompute, a photo added — so testing `after.verified === true` would resend
 * the same notification on every subsequent write forever. Both of these
 * compare against `before`.
 */
export function restroomTransitions(
  before: Doc,
  after: Doc,
  restroomId: string,
): NotificationItem[] {
  if (before === undefined || after === undefined) return [];

  const owner = str(after.createdBy);
  if (!owner) return [];

  const out: NotificationItem[] = [];
  const base = { userId: owner, actorId: null, restroomId, reviewId: null } as const;

  if (before.verified !== true && after.verified === true) {
    out.push({ ...base, id: `ver_${restroomId}`, kind: 'verified' });
  }

  // `hiddenAt` is null until the reports outnumber the confirmations, and goes
  // back to null if the balance recovers — so this is a genuine edge both ways.
  if (before.hiddenAt == null && after.hiddenAt != null) {
    out.push({ ...base, id: `hid_${restroomId}`, kind: 'hidden' });
  }

  return out;
}

/** Firestore rejects a batch over 500 writes. Matches restroom-cleanup.ts. */
const BATCH_LIMIT = 200;

/**
 * ⚠️ `set()` on a DERIVED id, which is what makes a retry safe.
 *
 * Every other trigger in this codebase logs its errors and does not rethrow,
 * because its work recomputes from scratch on the next write. A notification
 * has no such property: a dropped write is gone forever, so the callers of this
 * function rethrow and let the platform retry.
 *
 * Rethrowing is only safe if the retry cannot duplicate, and that is why no id
 * here is auto-generated. `rev_{reviewId}` and `con_{voteId}` are one per source
 * document; `ver_{restroomId}` fires once because a restroom verifies once; and
 * `hid_{restroomId}` overwrites if an entry is hidden, recovers and is hidden
 * again — which is the right reading, since the old warning is spent.
 *
 * `readAt` is written as null rather than omitted. `unchanged()` in the rules is
 * `diff().unchangedKeys().hasAll([...])`, and `unchangedKeys()` only contains
 * keys present in BOTH maps — so a create that omitted a key would make every
 * future update of that document permanently denied. Reviews document the same
 * trap for `buildingId`.
 */
export async function writeNotifications(items: NotificationItem[]): Promise<void> {
  if (items.length === 0) return;

  const db = getFirestore();

  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const item of items.slice(i, i + BATCH_LIMIT)) {
      const { id, ...data } = item;
      batch.set(db.collection('notifications').doc(id), {
        ...data,
        readAt: null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
}

/** The restroom's author, for the two triggers that only hold a restroom id. */
export async function restroomOwner(restroomId: string): Promise<string | null> {
  const snap = await getFirestore().collection('restrooms').doc(restroomId).get();
  return snap.exists ? str(snap.get('createdBy')) : null;
}
