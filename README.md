<img width="2000" height="1500" alt="flushy-flash-github-repository-cover" src="https://github.com/user-attachments/assets/eee81c91-4e7d-4631-ae40-caf030c10ef8" />

# Flushy Flash

[![ci](https://github.com/yjaphzs/flushy-flash/actions/workflows/ci.yml/badge.svg)](https://github.com/yjaphzs/flushy-flash/actions/workflows/ci.yml)
[![firebase-rules](https://github.com/yjaphzs/flushy-flash/actions/workflows/firebase-rules.yml/badge.svg)](https://github.com/yjaphzs/flushy-flash/actions/workflows/firebase-rules.yml)

A campus restroom finder for **Central Luzon State University**. Map of campus
restrooms, student submissions with photos, reviews and ratings, profiles and a
review feed.

> Working on this with an AI agent? See [AGENTS.md](./AGENTS.md) for the rules and
> gotchas that are not obvious from the code — several stack choices here look
> like mistakes and are not.

## Stack

| Concern | Choice | Note |
|---|---|---|
| Framework | Expo SDK 57 (RN 0.86.3) | versions track the SDK exactly — see below |
| Navigation | expo-router 57 | native `Stack`; tabs use `expo-router/js-tabs` for the floating bar (AGENTS.md §1) |
| UI | [HeroUI Native](https://heroui.com/docs/native) 1.0.9 | 39 components |
| Styling | [Uniwind](https://uniwind.dev) 1.12 + Tailwind **v4** | Tailwind is CSS-first: no `tailwind.config.js` |
| Backend | React Native Firebase 26 | **native** SDKs — Auth, Firestore, Storage, RTDB |
| Map | MapLibre Native 11 | free OSM tiles via OpenFreeMap, no API key |
| State | Zustand 5 | selector hooks, not Context |
| Lists | LegendList 3 | `ScrollView` + `.map()` is banned |

### This app cannot run in Expo Go

`@react-native-firebase/*` and `@maplibre/maplibre-react-native` are native
modules. A custom dev build is mandatory, and must be rebuilt after any change to
`app.json` plugins, fonts, or native dependencies.

### Versions are pinned exactly, and track the SDK

Every dependency is pinned with no `^`/`~`. Where Expo SDK 57 pins a version
(React Native, React, Reanimated, worklets, jest…) we use **the SDK's version,
not npm latest** — npm latest runs ahead on several core packages, and
`expo-modules-core` is compiled against the SDK's headers. `npx expo-doctor`
passing is the check that this still holds.

## Setup

```bash
npm install
```

Then supply a Firebase config — **the app cannot build without one**, because the
native SDKs read it at prebuild time. It is gitignored (this repo is public), so
every fresh clone needs it. `npm run prebuild` checks for it and tells you what to
do rather than failing with a raw ENOENT.

**Option A — real Firebase project.** Needed for anything beyond local UI work.

1. Firebase Console → add an **Android** app with package `xyz.yjaphzs.flushyflash`
   → download `google-services.json` → place at the repo root.
2. Add an **iOS** app with the same bundle id → download
   `GoogleService-Info.plist` → place at the repo root.
3. Enable **Email/Password** under Authentication → Sign-in method.
4. Create the Firestore database.

With the Firebase CLI authenticated (`npx firebase-tools login --reauth`) you can
skip the download:

```bash
npx firebase-tools apps:sdkconfig android --project <your-project-id> > google-services.json
```

**Refreshing the config.** If you register a new SHA-1 or change apps, re-pull it
rather than hand-editing:

```bash
npm run firebase:sdkconfig    # overwrites google-services.json
```

Do not use `... > google-services.json` — a shell redirect writes the CLI's error
text into the file when the command fails, producing a file that looks present but
is not JSON.

**Option B — emulators only.** No Firebase account required; good for UI work.

```bash
npm run firebase:placeholder     # writes a structurally valid fake config
echo "EXPO_PUBLIC_FIREBASE_USE_EMULATORS=true" >> .env.local
npm run firebase:emulators       # in a second terminal
```

The placeholder is recognised on every prebuild and warns you it is in use, so
you cannot mistake it for a real backend.

Deploy the security rules **before** running the app — they are the actual
security boundary, not a formality:

```bash
npm run test:rules     # prove them first: 37 adversarial cases
npm run deploy:rules   # firestore rules + indexes, RTDB, storage
```

In CI, `firebase-rules.yml` does exactly this on every push to `main` that touches
a rules file — but only after the attack matrix passes. It needs two repo secrets:
`FIREBASE_TOKEN` (from `npx firebase-tools login:ci`) and `FIREBASE_PROJECT_ID`.

Seed the campus buildings from OpenStreetMap (see below), then build:

```bash
npx expo prebuild --clean
npx expo run:android --device        # local build
npx expo start --dev-client          # bundler
```

On Windows, iOS dev builds must go through EAS (`eas device:create` first, to
register the UDID, then `eas build --profile development -p ios`).

## Seeding campus buildings

CLSU is well mapped in OpenStreetMap — 103 named buildings — but has essentially
no mapped restrooms. So buildings are seeded automatically and restrooms are
crowd-sourced.

```bash
npm run seed:buildings                     # fetch → scripts/buildings.seed.csv
# review the CSV (see the warnings it prints), then authenticate and upload:
gcloud auth application-default login
npx tsx scripts/seed-buildings.ts --upload
```

The OSM data is genuinely messy, so the script normalises apostrophes, de-dupes
by name + proximity, and **flags ambiguities for a human** rather than guessing:
several colleges (Engineering, Education) are mapped as 2–3 separate wings under
one name. Review those rows and give them distinct names before uploading.

### Why the upload needs admin credentials

`google-services.json` cannot do this, and the reason is worth understanding —
the two credentials are opposites:

| | `google-services.json` | service account / ADC |
|---|---|---|
| Kind | **Client** config | **Admin** credential |
| Privileges | None — every action gated by `firestore.rules` | **Bypasses rules entirely** |
| Exposure | Ships inside every APK, extractable | A genuine secret |

The seed needs admin because `firestore.rules` makes `buildings` **admin-write-only**
— students add restrooms, not buildings — so no client credential can write them.

`gcloud auth application-default login` is preferred: it leaves no downloadable
key. A service-account key (`GOOGLE_APPLICATION_CREDENTIALS=./service-account.json`)
also works and is what unattended CI would use, but it is a long-lived secret with
full project access. It is gitignored; keep it that way.

## Project layout

```
src/
  app/              expo-router routes; (auth) and (app) groups gated by Stack.Protected
  components/       design system — the only UI surface app code imports
  features/         domain logic: auth, buildings, restrooms, reviews, profile
  stores/           Zustand state (selector hooks, not Context)
  hooks/            auth listener, campus data subscriptions, location
  lib/              campus constants, firebase init, geo maths, shared types
scripts/            Node tooling (OpenStreetMap building seed); has its own tsconfig
```

## Conventions

These are enforced, not aspirational — `npm run lint` fails on violations.

- **App code imports UI only from `@/components/*`.** Never `react-native`,
  `heroui-native`, `expo-image`, `@legendapp/list` or MapLibre directly. The
  wrappers in `src/components/` narrow props and are the single place to change
  an implementation. Provider setup lives in `src/components/app-providers.tsx`
  so the rule has no carve-outs.
- **Compound components.** A non-text component never takes a string child —
  `<Button><Button.Label>Save</Button.Label></Button>`.
- **Native navigators only.** `@react-navigation/stack` and
  `@react-navigation/bottom-tabs` are banned.
- **MapLibre's API surface lives only in `src/components/map.tsx`.** v11 renamed
  most of v10 (`MapView`→`Map`, `ShapeSource`→`GeoJSONSource`,
  `PointAnnotation`→`Marker`), and most examples online are still v10.

## Why there is no geohash code

A multi-city restroom finder needs geohash cells and viewport queries to avoid
loading a planet-scale collection. Scoped to one campus, that machinery is pure
cost: the app subscribes to all buildings and restrooms once and keeps them in
memory, so filtering and "nearest" sorting are array operations
(`src/lib/geo.ts`). No geofire, no geo indexes, no read storms.

`src/lib/campus.ts` holds every campus constant, all measured from OSM rather
than estimated — including why the default camera is the administrative core and
not the geometric centroid (which sits in CLSU's farmland).

## Install the app

Grab the APK from [Releases](https://github.com/yjaphzs/flushy-flash/releases) and
open it on your Android phone. You will need to allow installs from unknown
sources the first time. Requires Android 7.0 or newer.

## Environment

Copy `.env.example` to `.env.local`. Every value has a working default, so the app
runs with no `.env` file at all.

Note there is deliberately **no `EXPO_PUBLIC_FIREBASE_API_KEY`**. This app uses the
native Firebase SDKs, which read project config from `google-services.json` /
`GoogleService-Info.plist` at prebuild — there is no `initializeApp({ apiKey })`
call, so such a variable would do nothing. To use a different Firebase project,
swap those files and re-run `npx expo prebuild --clean`.

What *is* configurable: emulator routing and the map tile URL. To run against
local emulators, set `EXPO_PUBLIC_FIREBASE_USE_EMULATORS=true` — and note the
Android emulator reaches your machine at `10.0.2.2`, not `localhost`, while a
physical device needs your LAN IP in `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST`.

## CI and releases

`main` is protected; work happens on `feat/`, `fix/` and `chore/` branches and
merges via PR. **PR titles become the release notes**, so write them for someone
who was not involved.

| Workflow | Trigger |
|---|---|
| `ci` | every PR — typecheck, lint, test, expo-doctor |
| `firebase-rules` | rules changes — runs the attack matrix, deploys on main |
| `native-check` | native config changes — prebuild + assembleDebug |
| `release` | a `v*` tag — signed APK attached to a GitHub Release |

Cutting a release:

```bash
npm version minor --no-git-tag-version   # then match expo.version in app.json
git commit -am "chore: release v1.1.0"
git tag v1.1.0 && git push origin main --tags
```

Release builds need these repo secrets: `GOOGLE_SERVICES_JSON`,
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`. Generate the keystore once and **back it up offline** —
losing it means installed apps can never be updated again.

## Verify

```bash
npm run typecheck                          # app
npx tsc --noEmit -p scripts/tsconfig.json  # node scripts
npm run lint
npm test
npx expo-doctor
npm run test:rules                         # security rules (needs Java)
```

## Status

Working: auth (sign up / in / out, password reset, verified-student badge), the
campus map with building pins, building and restroom detail, restroom submission,
security rules, and the OSM seed pipeline.

Stubbed: the review composer and the review feed — the follow graph and
fan-out-on-read query are designed but not yet built.

Ratings are read live via `getAggregateFromServer` rather than a denormalised
counter, so no Cloud Function (and no Blaze plan) is needed yet. `ratingSum` /
`ratingCount` already exist and already reject client writes, so moving to a
Function later is additive — no migration, no rules change.
