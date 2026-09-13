/**
 * Backfills the trust system's fields onto data that predates it.
 *
 * ## Why this is not optional, even though the triggers self-heal
 *
 * `onVoteWritten` and `onRestroomWritten` recompute from scratch, so every
 * document repairs itself the next time anyone touches it. That is enough for
 * the vote aggregates, which are all zero anyway until somebody votes.
 *
 * It is NOT enough for `pendingRestroomCount`. The contribution cap reads that
 * field, and `firestore.rules` defaults a missing one to zero — deliberately,
 * so an existing profile is not locked out. The consequence is that until a
 * user's restrooms are next written, their quota reads empty no matter how many
 * they have already added, and the cap this whole feature exists to impose does
 * not apply to exactly the people who have contributed most.
 *
 * ## Usage
 *
 *   npm run backfill:trust -- --dry-run    # print what would change
 *   npm run backfill:trust
 *
 * Idempotent: re-running it writes nothing the second time. Safe to run against
 * a live project while the app is in use — it only ever writes server-owned
 * aggregate fields, which no client may touch.
 *
 * Credentials resolve as `seed-buildings.ts` does: `gcloud auth
 * application-default login` preferred, a service-account key only where that
 * cannot work.
 */
import { existsSync } from 'node:fs';

/** Firestore rejects a batch over 500 writes. Matches purge-user.ts. */
const BATCH_LIMIT = 200;

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  /**
   * ADC user credentials need a quota project, and without one this fails with
   * a wrapped URL and nothing that names the cause.
   *
   * `gcloud auth application-default login` writes credentials with no quota
   * project attached, so the Identity Toolkit and Firestore APIs reject them
   * even though the credentials are perfectly valid and `gcloud auth
   * application-default print-access-token` happily mints a token. Setting it
   * here rather than telling the operator to run
   * `gcloud auth application-default set-quota-project`, because that mutates
   * their global gcloud config to make one script work.
   *
   * `??=` so an explicit environment value still wins.
   */
  process.env.GOOGLE_CLOUD_QUOTA_PROJECT ??=
    process.env.FIREBASE_PROJECT_ID ?? 'flushy-flash';
  const { applicationDefault, initializeApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && !existsSync(keyPath)) {
    throw new Error(`GOOGLE_APPLICATION_CREDENTIALS points to a missing file: ${keyPath}`);
  }

  try {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID ?? 'flushy-flash',
    });
  } catch {
    throw new Error(
      'No admin credentials found.\n\n' +
        '  Preferred — short-lived, nothing to leak:\n' +
        '    gcloud auth application-default login\n',
    );
  }

  const db = getFirestore();
  console.log(dryRun ? 'Dry run — nothing will be written.\n' : 'Writing.\n');

  // ---- restrooms: the four vote aggregates ----
  const restrooms = await db.collection('restrooms').get();
  const stale = restrooms.docs.filter((d) => d.get('trustScore') === undefined);

  console.log(`restrooms: ${restrooms.size} total, ${stale.length} missing the aggregates`);

  if (!dryRun) {
    for (let i = 0; i < stale.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      for (const doc of stale.slice(i, i + BATCH_LIMIT)) {
        // Zeroes, not a recount: nothing has voted yet, because the collection
        // did not exist until this deploy. `verified` is left exactly as it is —
        // it has only ever been written false, and overwriting it here would be
        // this script inventing a verdict rather than recording one.
        batch.update(doc.ref, {
          confirmCount: 0,
          reportCount: 0,
          trustScore: 0,
          hiddenAt: null,
        });
      }
      await batch.commit();
    }
  }

  // ---- users: the pending count, computed from the restrooms above ----
  const pending = new Map<string, number>();
  for (const doc of restrooms.docs) {
    const uid = doc.get('createdBy');
    if (typeof uid !== 'string' || !uid || uid.startsWith('anon_')) continue;
    // Matches recomputePending(): unverified and not hidden.
    if (doc.get('verified') === true || doc.get('hiddenAt') != null) continue;
    pending.set(uid, (pending.get(uid) ?? 0) + 1);
  }

  const users = await db.collection('users').get();
  const needsCount = users.docs.filter((d) => {
    if (d.get('deleted') === true) return false;
    return d.get('pendingRestroomCount') !== (pending.get(d.id) ?? 0);
  });

  console.log(`users:     ${users.size} total, ${needsCount.length} with a wrong pending count`);
  for (const doc of needsCount) {
    const next = pending.get(doc.id) ?? 0;
    console.log(`  ${doc.id}  ${doc.get('pendingRestroomCount') ?? '(absent)'} -> ${next}`);
  }

  if (!dryRun) {
    for (let i = 0; i < needsCount.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      for (const doc of needsCount.slice(i, i + BATCH_LIMIT)) {
        batch.update(doc.ref, { pendingRestroomCount: pending.get(doc.id) ?? 0 });
      }
      await batch.commit();
    }
  }

  console.log(dryRun ? '\nDry run complete.' : '\nDone.');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
