import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentDeleted, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
import { logger } from 'firebase-functions';

import { purgeUser } from './purge-user';
import { affectedRestrooms, recomputeRating } from './rating-aggregate';
import { cleanupRestroom } from './restroom-cleanup';
import { purgeCutoff, recomputePending, recomputeTrust } from './trust';

initializeApp();

/**
 * asia-southeast1 to match Firestore and RTDB (AGENTS.md §11), which is a
 * permanent decision — a function in another region would pay a round trip to
 * Singapore on every read in the purge.
 */
setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 });

/**
 * How recently the caller must have proved who they are.
 *
 * `reauthenticateWithCredential` mints a token with a fresh `auth_time`, and
 * this is what makes the client's password prompt REAL rather than decorative:
 * without it, anyone holding a stolen session token could delete the account
 * without knowing the password, and the dialog would be pure theatre.
 */
const MAX_AUTH_AGE_S = 5 * 60;

export const deleteAccount = onCall(
  // The Storage enumeration is the slow step; the default 60s is not enough for
  // an account with photos.
  { timeoutSeconds: 300, memory: '512MiB' },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError('unauthenticated', 'Sign in first.');

    const authTime = Number(auth.token.auth_time ?? 0);
    const age = Date.now() / 1000 - authTime;
    if (!authTime || age > MAX_AUTH_AGE_S) {
      throw new HttpsError('failed-precondition', 'stale-auth');
    }

    logger.info('deleteAccount: starting', { uid: auth.uid });
    try {
      const result = await purgeUser(auth.uid);
      logger.info('deleteAccount: done', { uid: auth.uid, ...result });
      return { ok: true, ...result };
    } catch (e) {
      // Deliberately not swallowed: the account still exists at this point, so
      // the client can surface a failure and the user can retry.
      logger.error('deleteAccount: failed', { uid: auth.uid, error: String(e) });
      throw new HttpsError('internal', 'Could not delete the account.');
    }
  },
);

/**
 * Keeps `restrooms.ratingSum` / `ratingCount` in step with the reviews.
 *
 * These fields have existed since the schema was written and have been pinned
 * to 0 the whole time, because the rules reject every client write to an
 * aggregate (§7) and nothing server-side maintained them. This is the piece
 * that was always meant to arrive — no migration and no rules change, exactly
 * as `restrooms/api.ts` predicted.
 *
 * ⚠️ **Until this has run once, existing restrooms still read 0.** The trigger
 * only fires on a review WRITE, so a restroom reviewed before deployment keeps
 * its stale zero until someone posts or edits a review on it. That is why the
 * pin treats 0 as "no reviews yet" rather than as a rating of zero.
 *
 * Deliberately `onDocumentWritten` rather than three separate handlers:
 * create, update and delete all reduce to the same recomputation, and account
 * deletion's re-key is a delete plus a create that must net out.
 */
export const onReviewWritten = onDocumentWritten('reviews/{reviewId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  for (const restroomId of affectedRestrooms(before, after)) {
    try {
      await recomputeRating(restroomId);
    } catch (e) {
      // Logged, not rethrown. Rethrowing would retry the whole event, and the
      // next review on this restroom recomputes from scratch anyway — that
      // self-healing property is the reason for recomputing (see its docblock).
      logger.error('onReviewWritten: recompute failed', { restroomId, error: String(e) });
    }
  }
});

/**
 * The community's verdict on a restroom, counted.
 *
 * Owns `confirmCount`, `reportCount`, `trustScore`, `verified` and `hiddenAt` —
 * none of which any client may write. Two verified students promote an entry,
 * or one admin, which is the only reason the map can be bootstrapped before
 * anyone has confirmed a @clsu.edu.ph address.
 */
export const onVoteWritten = onDocumentWritten('restroomVotes/{voteId}', async (event) => {
  const restroomId = (event.data?.after.data() ?? event.data?.before.data())?.restroomId;
  if (typeof restroomId !== 'string' || !restroomId) return;

  try {
    await recomputeTrust(restroomId);
  } catch (e) {
    // Logged, not rethrown, exactly as onReviewWritten does: the next vote on
    // this restroom recomputes from scratch, so a retry of the whole event buys
    // nothing that self-healing does not already give.
    logger.error('onVoteWritten: recompute failed', { restroomId, error: String(e) });
  }
});

/**
 * Keeps each author's `pendingRestroomCount` honest.
 *
 * This is the number the contribution cap reads in `firestore.rules`, which
 * cannot count a collection itself.
 *
 * ⚠️ **The cascade here is deliberate and it terminates.** A vote writes the
 * restroom (above), which fires this, which writes only the USER document.
 * Nothing writes back to the restroom, so there is no loop — but adding any
 * restroom write to this function would create one.
 */
export const onRestroomWritten = onDocumentWritten('restrooms/{restroomId}', async (event) => {
  const before = event.data?.before.data()?.createdBy;
  const after = event.data?.after.data()?.createdBy;

  // A set, because a re-key during account deletion moves a restroom from one
  // author to another and both counts change.
  const authors = new Set(
    [before, after].filter((uid): uid is string => typeof uid === 'string' && uid !== ''),
  );

  for (const uid of authors) {
    try {
      await recomputePending(uid);
    } catch (e) {
      logger.error('onRestroomWritten: pending recompute failed', { uid, error: String(e) });
    }
  }
});

/**
 * Everything a deleted restroom leaves behind.
 *
 * One path for both deleters — the author removing their own entry, and the
 * scheduled purge below — so neither can forget a step the other remembers.
 */
export const onRestroomDeleted = onDocumentDeleted(
  'restrooms/{restroomId}',
  async (event) => {
    const restroomId = event.params.restroomId;
    try {
      await cleanupRestroom(restroomId);
    } catch (e) {
      // Orphaned bytes cost storage; a failed retry would cost nothing more.
      logger.error('onRestroomDeleted: cleanup failed', { restroomId, error: String(e) });
    }
  },
);

/**
 * Deletes restrooms the community hid more than a week ago.
 *
 * The week is a grace period with a purpose: "I couldn't find it" and "this is
 * fake" look identical from three reports, so hiding is reversible and only
 * deletion is not. Confirmations arriving in that window clear `hiddenAt` and
 * the entry simply returns.
 *
 * Deletes the document ONLY — `onRestroomDeleted` does the rest.
 */
export const purgeHiddenRestrooms = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 540, memory: '512MiB' },
  async () => {
    const db = getFirestore();
    const stale = await db
      .collection('restrooms')
      .where('hiddenAt', '<=', purgeCutoff(new Date()))
      .limit(200)
      .get();

    logger.info('purgeHiddenRestrooms: starting', { count: stale.size });

    // One at a time rather than a batch: each delete fires onRestroomDeleted,
    // and a failure part-way should leave the rest to the next run rather than
    // rolling back deletions whose cleanup has already happened.
    for (const doc of stale.docs) {
      try {
        await doc.ref.delete();
      } catch (e) {
        logger.error('purgeHiddenRestrooms: delete failed', {
          restroomId: doc.id,
          error: String(e),
        });
      }
    }
  },
);
