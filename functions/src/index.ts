import { initializeApp } from 'firebase-admin/app';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { logger } from 'firebase-functions';

import { purgeUser } from './purge-user';
import { affectedRestrooms, recomputeRating } from './rating-aggregate';

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
