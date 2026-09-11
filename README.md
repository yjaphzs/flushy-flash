# Flushy Flash

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
| Navigation | expo-router 57 | native `Stack` + `NativeTabs` only |
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

Then supply your own Firebase config — the app will not build without it:

1. Firebase Console → add an **Android** app with package `dev.g2c.flushyflash`
   → download `google-services.json` → place at the repo root.
2. Add an **iOS** app with the same bundle id → download
   `GoogleService-Info.plist` → place at the repo root.
3. Enable **Email/Password** under Authentication → Sign-in method.
4. Create the Firestore database.

Deploy the security rules **before** running the app — they are the actual
security boundary, not a formality:

```bash
npx firebase-tools@latest deploy --only firestore:rules,firestore:indexes,storage,database
```

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
npm run seed:buildings                              # fetch → scripts/buildings.seed.csv
# review the CSV (see warnings it prints), then:
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
  npx tsx scripts/seed-buildings.ts --upload
```

The OSM data is genuinely messy, so the script normalises apostrophes, de-dupes
by name + proximity, and **flags ambiguities for a human** rather than guessing:
several colleges (Engineering, Education) are mapped as 2–3 separate wings under
one name. Review those rows and give them distinct names before uploading.

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

## Verify

```bash
npm run typecheck                          # app
npx tsc --noEmit -p scripts/tsconfig.json  # node scripts
npm run lint
npm test
npx expo-doctor
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
