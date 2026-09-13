/**
 * Grants or revokes the `admin` custom claim.
 *
 * ## Why this has to exist
 *
 * `firestore.rules` checks `isAdmin()` in nine places — deleting any user's
 * restroom, seeding buildings, reading another person's votes — and **nothing in
 * this repo has ever granted the claim**. Every one of those branches was
 * unreachable.
 *
 * That became load-bearing with the trust system. A restroom needs two verified
 * CLSU students to confirm it, or one admin; with no admin and no confirmed
 * @clsu.edu.ph accounts yet, nothing could ever be verified, every contributor
 * would hit the three-restroom cap permanently, and the map would stop growing.
 *
 * ## Usage
 *
 *   npm run grant:admin -- --uid <uid>
 *   npm run grant:admin -- --email someone@example.com
 *   npm run grant:admin -- --uid <uid> --revoke
 *   npm run grant:admin -- --list
 *
 * ⚠️ **A custom claim does not reach a signed-in device until its ID token is
 * refreshed.** Tokens last an hour. Either sign out and back in, or call
 * `refreshClaims()` from `src/features/auth/api.ts` — the same helper the
 * verify-email flow already uses for exactly this reason.
 *
 * ⚠️ **An admin confirmation is worth two.** Granting this to someone is
 * granting them the power to verify any restroom single-handedly, and to delete
 * any restroom at all. It is not a badge.
 *
 * Credentials resolve exactly as `seed-buildings.ts` does — `gcloud auth
 * application-default login` preferred, a service-account key only where that
 * cannot work.
 */
import { existsSync } from 'node:fs';

type Args = { uid?: string; email?: string; revoke: boolean; list: boolean };

function parseArgs(argv: string[]): Args {
  const args: Args = { revoke: false, list: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--uid') args.uid = argv[++i];
    else if (a === '--email') args.email = argv[++i];
    else if (a === '--revoke') args.revoke = true;
    else if (a === '--list') args.list = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.list && !args.uid && !args.email) {
    console.error(
      'Name an account.\n\n' +
        '  npm run grant:admin -- --email you@example.com\n' +
        '  npm run grant:admin -- --uid <uid>\n' +
        '  npm run grant:admin -- --uid <uid> --revoke\n' +
        '  npm run grant:admin -- --list\n',
    );
    process.exitCode = 1;
    return;
  }

  const { applicationDefault, initializeApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');

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

  const auth = getAuth();

  if (args.list) {
    // Paged rather than a single listUsers(): the default page is 1000 and a
    // silent truncation would read as "nobody is an admin".
    let pageToken: string | undefined;
    const admins: string[] = [];
    do {
      const page = await auth.listUsers(1000, pageToken);
      for (const u of page.users) {
        if (u.customClaims?.admin === true) admins.push(`${u.uid}  ${u.email ?? '(no email)'}`);
      }
      pageToken = page.pageToken;
    } while (pageToken);

    console.log(admins.length ? `Admins:\n  ${admins.join('\n  ')}` : 'No admins.');
    return;
  }

  const user = args.uid
    ? await auth.getUser(args.uid)
    : await auth.getUserByEmail(args.email as string);

  // Merge rather than replace: setCustomUserClaims OVERWRITES the whole object,
  // so passing { admin } alone would silently drop any other claim the account
  // carries. There are none today, which is exactly when this is easy to get
  // wrong and impossible to notice.
  const claims = { ...(user.customClaims ?? {}) };
  if (args.revoke) delete claims.admin;
  else claims.admin = true;

  await auth.setCustomUserClaims(user.uid, claims);

  console.log(
    `${args.revoke ? 'Revoked' : 'Granted'} admin for ${user.email ?? user.uid} (${user.uid}).\n` +
      'Their device keeps the old token for up to an hour — sign out and in, or call\n' +
      'refreshClaims() from the app, before the change takes effect.',
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
