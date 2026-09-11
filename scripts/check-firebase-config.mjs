/**
 * Preflight for `expo prebuild`.
 *
 * Without this, a missing google-services.json fails deep inside
 * @expo/config-plugins with a raw ENOENT and a stack trace pointing at
 * withAndroidDangerousBaseMod — which tells you nothing about what to do. The
 * file is gitignored on purpose (this repo is public), so every fresh clone hits
 * it, and it is worth failing clearly.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const ANDROID = resolve(ROOT, 'google-services.json');
const IOS = resolve(ROOT, 'GoogleService-Info.plist');

const platform = process.argv.includes('--platform')
  ? process.argv[process.argv.indexOf('--platform') + 1]
  : 'all';

const needsAndroid = platform === 'all' || platform === 'android';
const needsIos = platform === 'all' || platform === 'ios';

const missing = [];
if (needsAndroid && !existsSync(ANDROID)) missing.push('google-services.json');
if (needsIos && !existsSync(IOS)) missing.push('GoogleService-Info.plist');

if (missing.length === 0) {
  // Catch a truncated or half-written download before gradle does.
  if (needsAndroid) {
    try {
      const parsed = JSON.parse(readFileSync(ANDROID, 'utf8'));

      // Read the expected package from app.json rather than hardcoding it, so a
      // rename can never leave this check silently out of date.
      const appJson = JSON.parse(readFileSync(resolve(ROOT, 'app.json'), 'utf8'));
      const expected = appJson?.expo?.android?.package;

      // A google-services.json legitimately holds one client per registered app,
      // so check whether ANY of them matches — not just the first.
      const packages = (parsed?.client ?? [])
        .map((c) => c?.client_info?.android_client_info?.package_name)
        .filter(Boolean);

      if (expected && packages.length > 0 && !packages.includes(expected)) {
        console.error(
          `\n  google-services.json has no client for "${expected}".\n` +
            `  It contains: ${packages.join(', ')}\n\n` +
            `  The Android build will fail. Register that package in Firebase and\n` +
            `  re-download the config.\n`,
        );
        process.exit(1);
      }
      if (parsed?.project_info?.project_id === 'flushy-flash-placeholder') {
        console.warn(
          '\n  ⚠️  Using the PLACEHOLDER Firebase config.\n' +
            '     The app will only work against local emulators ' +
            '(EXPO_PUBLIC_FIREBASE_USE_EMULATORS=true).\n',
        );
      }
    } catch {
      console.error('\n  google-services.json is not valid JSON. Re-download it.\n');
      process.exit(1);
    }
  }
  process.exit(0);
}

console.error(`
  Missing Firebase config: ${missing.join(', ')}

  These are gitignored on purpose — this repo is public, and published Firebase
  API keys get scraped for signup spam and quota burn. Every fresh clone needs
  them supplied locally.

  Pick one:

  A) Real Firebase project — needed for anything beyond local development
       1. https://console.firebase.google.com -> your project -> Project settings
       2. Add an Android app with package name exactly:  xyz.yjaphzs.flushyflash
       3. Download google-services.json to the repo root
       4. Enable Email/Password under Authentication -> Sign-in method

     Or, if the Firebase CLI is authenticated (npx firebase-tools login --reauth):
       npx firebase-tools apps:sdkconfig android --project <your-project-id> \\
         > google-services.json

  B) Emulators only — no Firebase account required, good for UI work
       npm run firebase:placeholder
       Then set EXPO_PUBLIC_FIREBASE_USE_EMULATORS=true in .env.local
       and run:  npx firebase-tools emulators:start

  See README "Setup" and AGENTS.md section 11.
`);
process.exit(1);
