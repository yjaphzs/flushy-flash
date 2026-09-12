/**
 * Typed access to the app's environment configuration.
 *
 * ## Why there are no EXPO_PUBLIC_FIREBASE_API_KEY / PROJECT_ID / APP_ID vars
 *
 * This app uses `@react-native-firebase/*` — the **native** Firebase SDKs. They
 * read their project configuration from `google-services.json` (Android) and
 * `GoogleService-Info.plist` (iOS), which are compiled into the binary at
 * prebuild time. There is no `initializeApp({ apiKey, projectId, ... })` call
 * anywhere in this codebase, so adding those variables would create config that
 * looks meaningful and does nothing. That is worse than having none.
 *
 * That pattern belongs to the Firebase **JS** SDK, which this project
 * deliberately does not use (see AGENTS.md §1).
 *
 * What IS environment-driven is below: which backend to talk to (real vs local
 * emulators) and the map tile source.
 *
 * Expo only inlines variables prefixed `EXPO_PUBLIC_`, and it does so at build
 * time — they are readable inside the shipped binary, so nothing secret goes here.
 */

import { Platform } from 'react-native';

function readBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

function readPort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Default emulator host, per platform.
 *
 * The Android emulator cannot reach the host machine on `localhost` — that
 * resolves to the emulated device itself. `10.0.2.2` is the special alias for the
 * host loopback. A physical device on Wi-Fi can reach neither, and needs your
 * machine's LAN IP set explicitly via EXPO_PUBLIC_FIREBASE_EMULATOR_HOST.
 */
const defaultEmulatorHost = Platform.select({
  android: '10.0.2.2',
  default: '127.0.0.1',
});

export const env = {
  /** Free, keyless OSM vector tiles unless overridden. */
  mapStyleUrl:
    process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty',

  /**
   * OAuth web client id (`client_type: 3` in google-services.json).
   *
   * This is the one Google/Firebase identifier that legitimately belongs here,
   * and it is not a counter-example to the note above. The vars that rule bans
   * are the ones the NATIVE SDK reads for itself out of google-services.json /
   * GoogleService-Info.plist — duplicating those in env would be config that
   * looks meaningful and does nothing.
   *
   * This value is different: it is consumed by JavaScript, in
   * `GoogleSignin.configure({ webClientId })`, and without it `signIn()` returns
   * a null idToken and Firebase has nothing to exchange. It is not secret — it
   * ships inside the APK either way.
   *
   * Empty means Google Sign-In is unconfigured; features/auth/api.ts treats that
   * as "hide the button" rather than failing at the tap.
   */
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',

  firebase: {
    /**
     * Point the app at locally running Firebase emulators instead of the real
     * project. Off by default so a fresh clone talks to the real backend.
     */
    useEmulators: readBool(process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS),

    host: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ?? defaultEmulatorHost,

    // Must match the ports in firebase.json. Firestore is on 8181 rather than the
    // usual 8080, which is commonly occupied by other local services.
    ports: {
      auth: readPort(process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_PORT_AUTH, 9099),
      firestore: readPort(process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_PORT_FIRESTORE, 8181),
      storage: readPort(process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_PORT_STORAGE, 9199),
      database: readPort(process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_PORT_DATABASE, 9000),
    },
  },
} as const;
