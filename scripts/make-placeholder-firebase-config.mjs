/**
 * Writes a structurally valid but fake google-services.json.
 *
 * React Native Firebase needs this file to exist at prebuild time even when the
 * app will only ever talk to local emulators — the native SDK parses it during
 * initialisation. This lets someone clone the repo and build the app for UI work
 * without a Firebase account.
 *
 * The project id is deliberately "flushy-flash-placeholder" so
 * check-firebase-config.mjs can recognise it and warn on every prebuild. It
 * refuses to overwrite a real config.
 *
 *   npm run firebase:placeholder
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TARGET = resolve(process.cwd(), 'google-services.json');
const PLACEHOLDER_PROJECT = 'flushy-flash-placeholder';

if (existsSync(TARGET)) {
  let existing;
  try {
    existing = JSON.parse(readFileSync(TARGET, 'utf8'));
  } catch {
    console.error('google-services.json exists but is not valid JSON. Delete it and re-run.');
    process.exit(1);
  }

  if (existing?.project_info?.project_id !== PLACEHOLDER_PROJECT) {
    console.error(
      `\n  Refusing to overwrite: google-services.json belongs to the real project ` +
        `"${existing?.project_info?.project_id}".\n  Delete it first if you really want the ` +
        `placeholder.\n`,
    );
    process.exit(1);
  }
  console.log('Placeholder google-services.json already present.');
  process.exit(0);
}

// Shapes match what the native SDK expects. The values are inert: the app only
// works against emulators, which ignore project credentials.
const placeholder = {
  project_info: {
    project_number: '000000000000',
    project_id: PLACEHOLDER_PROJECT,
    storage_bucket: `${PLACEHOLDER_PROJECT}.appspot.com`,
    firebase_url: `https://${PLACEHOLDER_PROJECT}-default-rtdb.firebaseio.com`,
  },
  client: [
    {
      client_info: {
        mobilesdk_app_id: '1:000000000000:android:0000000000000000000000',
        android_client_info: { package_name: 'dev.g2c.flushyflash' },
      },
      oauth_client: [],
      api_key: [{ current_key: 'AIzaSyPlaceholderPlaceholderPlaceholder00' }],
      services: { appinvite_service: { other_platform_oauth_client: [] } },
    },
  ],
  configuration_version: '1',
};

writeFileSync(TARGET, `${JSON.stringify(placeholder, null, 2)}\n`, 'utf8');

console.log(`
  Wrote a PLACEHOLDER google-services.json.

  This only works against local emulators. Next:

    1. Add to .env.local:   EXPO_PUBLIC_FIREBASE_USE_EMULATORS=true
    2. Start the emulators: npx firebase-tools emulators:start
    3. Build:               npm run prebuild && npx expo run:android

  Delete the file and re-download the real one when you connect to a
  Firebase project.
`);
