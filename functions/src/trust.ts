import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

/** Weighted confirmations needed before a restroom counts as verified. */
export const VERIFY_SCORE = 2;

/** Reports needed before it is hidden — and they must outnumber the confirmations. */
export const HIDE_REPORTS = 3;

/** How many unverified restrooms one account may have at a time. */
export const PENDING_CAP = 3;

export type VoteDoc = {
  kind?: unknown;
  byStudent?: unknown;
  byAdmin?: unknown;
};

export type Tally = {
  confirmCount: number;
  reportCount: number;
  trustScore: number;
};

/**
 * Counts a restroom's votes into the three numbers stored on it.
 *
 * Pure, so the weighting is testable without a Firestore. The weighting is the
 * part worth testing: an admin confirmation scores 2 and a verified student's
 * scores 1, which is what lets one admin verify a restroom alone while two
 * students are needed otherwise.
 *
 * ⚠️ **A confirmation from an ordinary signed-in account scores ZERO.** It is
 * still counted in `confirmCount` — the UI says "3 people found this", and that
 * is true — but it cannot move the restroom to verified, because three throwaway
 * Google accounts must not be able to launder a fake onto the map. The two
 * numbers deliberately disagree, and `confirmCount > trustScore` is the normal
 * case rather than a bug.
 */
export function tally(votes: VoteDoc[]): Tally {
  let confirmCount = 0;
  let reportCount = 0;
  let trustScore = 0;

  for (const vote of votes) {
    if (vote.kind === 'report') {
      reportCount++;
      continue;
    }
    if (vote.kind !== 'confirm') continue;

    confirmCount++;
    if (vote.byAdmin === true) trustScore += 2;
    else if (vote.byStudent === true) trustScore += 1;
  }

  return { confirmCount, reportCount, trustScore };
}

/** Whether a tally has earned the badge. */
export function isVerified(t: Tally): boolean {
  return t.trustScore >= VERIFY_SCORE;
}

/**
 * Whether a tally means the entry should be hidden.
 *
 * Reports must OUTNUMBER confirmations, not merely reach the threshold. On a
 * busy restroom three "I couldn't find it" reports are entirely compatible with
 * twenty people who could — a confusing entrance is not a fake one — and hiding
 * it would delete a real restroom a week later.
 */
export function shouldHide(t: Tally): boolean {
  return t.reportCount >= HIDE_REPORTS && t.reportCount > t.confirmCount;
}

/**
 * Recomputes one restroom's vote aggregates, and the flags derived from them.
 *
 * Recomputes rather than applying a delta, for the reason `rating-aggregate.ts`
 * sets out at length: Cloud Functions deliver at least once, so a retried delta
 * is permanently and silently wrong, while a recompute heals on the next write.
 *
 * `hiddenAt` is set once and not refreshed while it stays hidden — the seven-day
 * clock must not restart every time another report lands — and cleared outright
 * if the confirmations catch up.
 */
export async function recomputeTrust(restroomId: string): Promise<void> {
  const db = getFirestore();
  const restroomRef = db.collection('restrooms').doc(restroomId);

  await db.runTransaction(async (tx) => {
    const restroom = await tx.get(restroomRef);
    if (!restroom.exists) return;

    const votes = await tx.get(
      db.collection('restroomVotes').where('restroomId', '==', restroomId),
    );
    const next = tally(votes.docs.map((d) => d.data() as VoteDoc));
    const verified = isVerified(next);
    const hidden = shouldHide(next);
    const wasHidden = restroom.get('hiddenAt') != null;

    const unchanged =
      restroom.get('confirmCount') === next.confirmCount &&
      restroom.get('reportCount') === next.reportCount &&
      restroom.get('trustScore') === next.trustScore &&
      restroom.get('verified') === verified &&
      wasHidden === hidden;
    if (unchanged) return;

    tx.update(restroomRef, {
      ...next,
      verified,
      // Left alone while it stays hidden: re-stamping it on every new report
      // would push the seven-day deletion out indefinitely.
      ...(hidden === wasHidden
        ? {}
        : { hiddenAt: hidden ? FieldValue.serverTimestamp() : null }),
    });
  });
}

/**
 * Recomputes how many unverified restrooms an account has.
 *
 * This is what the contribution cap reads, and the rules cannot compute it —
 * they cannot count a collection, so the count has to be a field.
 *
 * Hidden restrooms are excluded: one already reported into hiding is on its way
 * to deletion, and holding a slot hostage for the week before that would punish
 * the author twice for the same entry.
 */
export async function recomputePending(uid: string): Promise<void> {
  if (!uid || uid.startsWith('anon_')) return;

  const db = getFirestore();
  const userRef = db.collection('users').doc(uid);

  await db.runTransaction(async (tx) => {
    const user = await tx.get(userRef);
    // A tombstone, or an account deleted mid-flight. Writing here would
    // resurrect a profile that deletion was asked to remove.
    if (!user.exists || user.get('deleted') === true) return;

    const mine = await tx.get(db.collection('restrooms').where('createdBy', '==', uid));
    const pending = mine.docs.filter(
      (d) => d.get('verified') !== true && d.get('hiddenAt') == null,
    ).length;

    if (user.get('pendingRestroomCount') === pending) return;
    tx.update(userRef, { pendingRestroomCount: pending });
  });
}

/** Restrooms hidden longer than this are deleted outright. */
export const PURGE_AFTER_DAYS = 7;

/** The cutoff the scheduled purge compares `hiddenAt` against. */
export function purgeCutoff(now: Date): Timestamp {
  return Timestamp.fromMillis(now.getTime() - PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000);
}
