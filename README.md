<div align="center">

<img width="2000" height="1500" alt="flushy-flash-github-repository-cover" src="https://github.com/user-attachments/assets/eee81c91-4e7d-4631-ae40-caf030c10ef8" />

# 🚽 Flushy Flash

A campus restroom finder for **Central Luzon State University**.

[![ci](https://github.com/yjaphzs/flushy-flash/actions/workflows/ci.yml/badge.svg)](https://github.com/yjaphzs/flushy-flash/actions/workflows/ci.yml)
[![firebase-rules](https://github.com/yjaphzs/flushy-flash/actions/workflows/firebase-rules.yml/badge.svg)](https://github.com/yjaphzs/flushy-flash/actions/workflows/firebase-rules.yml)

</div>

---

> [!NOTE]
> **Working on this with an AI agent?** Read [AGENTS.md](./AGENTS.md) first. Several
> stack choices here look like mistakes and are not, and that file is where the
> reasoning lives.

---

## Table of contents

**For users**

- [What it does](#what-it-does)
- [Install the app](#install-the-app)

**For developers**

- [Stack](#stack)
- [Quick start](#quick-start)
- [Setup in detail](#setup-in-detail)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Install dependencies](#2-install-dependencies)
  - [3. Supply a Firebase config](#3-supply-a-firebase-config)
  - [4. Deploy the security rules](#4-deploy-the-security-rules)
  - [5. Seed the campus buildings](#5-seed-the-campus-buildings)
  - [6. Build and run](#6-build-and-run)
- [Scripts](#scripts)
- [Environment variables](#environment-variables)

**How it is built**

- [Project layout](#project-layout)
- [Data model](#data-model)
- [Architecture notes](#architecture-notes)
- [Conventions](#conventions)

**Working on it**

- [Verify before you push](#verify-before-you-push)
- [CI and releases](#ci-and-releases)
- [Troubleshooting](#troubleshooting)
- [Project status](#project-status)

---

## What it does

CLSU is well mapped in OpenStreetMap — 103 named buildings — and has essentially
**zero** mapped restrooms. Flushy Flash closes that gap by letting students map
them themselves.

| | Feature |
|---|---|
| 🗺️ | **Campus map** of student-submitted restrooms, each pin showing its own photo |
| ⚡ | **Find the nearest one** — one tap on the centre action, no account needed |
| 📷 | **Submit a restroom** — drop a pin, add up to 5 photos, say who may use it, describe how to get there |
| ⭐ | **Reviews and ratings**, one per person per restroom |
| 🔖 | **Save** the ones you rely on |
| 🎓 | **Verified-student badge**, derived from a confirmed `@clsu.edu.ph` address |

**Browsing needs no account.** The map opens straight onto campus for anyone; an
account is only required to contribute.

---

## Install the app

1. Download the latest APK from
   [**Releases**](https://github.com/yjaphzs/flushy-flash/releases).
2. Open it on your Android phone.
3. Allow installs from unknown sources when prompted — you only do this once.

Requires **Android 7.0 or newer**. iOS builds are not published yet.

Once installed, the app checks for newer releases itself and offers to
download and install them — you only need to do the above once.

> [!NOTE]
> **Samsung phones may block the install outright.** One UI 6.1 and newer ship
> **Auto Blocker** switched on, which refuses apps from outside the Galaxy Store
> and Play Store entirely — no permission prompt, just a system dialog the app
> never sees. Turn it off in **Settings → Security and privacy → Auto Blocker**,
> or install from a phone without it.

> [!IMPORTANT]
> Only an APK signed with the same release key can replace an installed one.
> A build you compiled yourself cannot update a Releases install, and vice
> versa — Android reports both as a bare "App not installed". Uninstall first
> if you are switching between them.

---

## Stack

| Concern | Choice | Note |
|---|---|---|
| Framework | Expo SDK 57 (RN 0.86.3) | versions track the SDK exactly — see below |
| Navigation | expo-router 57 | native `Stack`; tabs use `expo-router/js-tabs` for the floating bar ([AGENTS.md §1](./AGENTS.md)) |
| UI | [HeroUI Native](https://heroui.com/docs/native) 1.0.9 | 39 components |
| Styling | [Uniwind](https://uniwind.dev) 1.12 + Tailwind **v4** | Tailwind is CSS-first: there is no `tailwind.config.js` |
| Backend | React Native Firebase 26 | **native** SDKs — Auth, Firestore, Storage, RTDB |
| Map | MapLibre Native 11 | free OSM tiles via OpenFreeMap, no API key |
| State | Zustand 5 | selector hooks, not Context |
| Lists | LegendList 3 | `ScrollView` + `.map()` is banned for data |
| Animation | Reanimated 4 + Lottie | the floating tab bar, the search dialog |

<br>

### ⚠️ This app cannot run in Expo Go

`@react-native-firebase/*`, `@maplibre/maplibre-react-native`,
`@react-native-google-signin/google-signin` and `lottie-react-native` are **native
modules**. A custom dev build is mandatory.

Rebuild after any change to `app.json` plugins, fonts, or native dependencies.

<br>

### Versions are pinned exactly, and track the SDK

Every dependency is pinned with no `^` or `~`. Where Expo SDK 57 pins a version
(React Native, React, Reanimated, worklets, jest…) we use **the SDK's version, not
npm latest** — npm latest runs ahead on several core packages, and
`expo-modules-core` is compiled against the SDK's headers.

`npx expo-doctor` passing is the check that this still holds.

---

## Quick start

Already have the prerequisites and a `google-services.json`? This is the whole
loop:

```bash
npm install
npm run prebuild:android          # generates android/, needs the Firebase config
npx expo run:android --device     # build + install on a connected phone
npm start                         # bundler, for every run after the first
```

Everything below explains what each of those needs.

---

## Setup in detail

### 1. Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| Node | 24 (what CI uses) | everything |
| **JDK 17** | exactly 17 | Android builds — RN 0.86 declares `jvmToolchain(17)` and **fails cryptically on JDK 22+** |
| Android Studio | current | SDK, platform tools, a device or emulator |
| Java | 11+ | `npm run test:rules` (the Firebase emulator) |

`npm run prebuild` writes both `sdk.dir` and `org.gradle.java.home` into the
generated `android/` project, so a terminal that was opened before you set
`ANDROID_HOME` / `JAVA_HOME` still builds. That is why prebuild is a script here
and not a bare `expo prebuild`.

<br>

### 2. Install dependencies

```bash
npm install
```

<br>

### 3. Supply a Firebase config

**The app cannot build without one** — the native SDKs read it at prebuild time.
It is gitignored (this repo is public), so every fresh clone needs its own.
`npm run prebuild` checks for it and tells you what to do rather than failing with
a raw `ENOENT` from deep inside a config plugin.

<details open>
<summary><b>Option A — a real Firebase project</b> (needed for anything beyond local UI work)</summary>

<br>

1. Firebase Console → add an **Android** app with package
   `xyz.yjaphzs.flushyflash` → download `google-services.json` → put it at the
   repo root.
2. Add an **iOS** app with the same bundle id → download
   `GoogleService-Info.plist` → put it at the repo root.
3. Authentication → Sign-in method → enable **Email/Password** and **Google**.
4. Create the **Firestore** database.

With the Firebase CLI authenticated (`npx firebase-tools login --reauth`) you can
skip the manual download — and re-pull it whenever you register a new SHA-1:

```bash
npm run firebase:sdkconfig    # overwrites google-services.json
```

> [!WARNING]
> Do **not** use `npx firebase-tools apps:sdkconfig … > google-services.json`. A
> shell redirect writes the CLI's *error text* into the file when the command
> fails, leaving a file that looks present and is not JSON. The script above uses
> `--out`, which does not have this failure mode.

</details>

<details>
<summary><b>Option B — emulators only</b> (no Firebase account, good for UI work)</summary>

<br>

```bash
npm run firebase:placeholder     # writes a structurally valid fake config
echo "EXPO_PUBLIC_FIREBASE_USE_EMULATORS=true" >> .env.local
npm run firebase:emulators       # in a second terminal
```

The placeholder is recognised on every prebuild, which warns you it is in use — so
you cannot mistake it for a real backend.

</details>

<br>

### 4. Deploy the security rules

Do this **before** running the app against a real project. The rules are the
actual security boundary, not a formality:

```bash
npm run test:rules     # prove them first — 70 adversarial cases
npm run deploy:rules   # firestore rules + indexes, RTDB, storage
```

In CI, `firebase-rules.yml` does exactly this on every push to `main` that touches
a rules file — but only *after* the attack matrix passes. It needs two repo
secrets: `FIREBASE_TOKEN` (from `npx firebase-tools login:ci`) and
`FIREBASE_PROJECT_ID`.

<br>

### 5. Seed the campus buildings

Buildings come from OpenStreetMap; restrooms are crowd-sourced.

```bash
npm run seed:buildings                     # fetch → scripts/buildings.seed.csv
# review the CSV (read the warnings it prints), then authenticate and upload:
gcloud auth application-default login
npx tsx scripts/seed-buildings.ts --upload
```

The OSM data is genuinely messy, so the script normalises apostrophes, de-dupes by
name + proximity, and **flags ambiguities for a human** rather than guessing:
several colleges (Engineering, Education) are mapped as 2–3 separate wings under
one name. Give those rows distinct names before uploading.

<details>
<summary><b>Why the upload needs admin credentials</b></summary>

<br>

`google-services.json` cannot do this, and the reason is worth understanding — the
two credentials are opposites:

| | `google-services.json` | service account / ADC |
|---|---|---|
| Kind | **Client** config | **Admin** credential |
| Privileges | None — every action gated by `firestore.rules` | **Bypasses rules entirely** |
| Exposure | Ships inside every APK, extractable | A genuine secret |

The seed needs admin because `firestore.rules` makes `buildings`
**admin-write-only** — students add restrooms, not buildings — so no client
credential can write them.

`gcloud auth application-default login` is preferred: it leaves no downloadable
key. A service-account key (`GOOGLE_APPLICATION_CREDENTIALS=./service-account.json`)
also works and is what unattended CI would use, but it is a long-lived secret with
full project access. It is gitignored; keep it that way.

</details>

<br>

### 6. Build and run

```bash
npm run prebuild:android             # regenerates android/ from app.json
npx expo run:android --device        # pick your connected phone from the list
npm start                            # bundler for subsequent runs
```

To run on a physical phone: enable **Developer options → USB debugging**, plug it
in, accept the RSA prompt, and confirm with `adb devices` that it shows `device`
and not `unauthorized`.

On Windows, iOS dev builds must go through EAS — `eas device:create` to register
the UDID, then `eas build --profile development -p ios`.

---

## Scripts

| Script | What it does |
|---|---|
| `npm start` | Metro bundler for the dev client. Add `--clear` when a change refuses to appear |
| `npm run android` / `ios` | `expo run:*` — compile and install |
| `npm run prebuild` | config check → `expo prebuild --clean` → Android build config |
| `npm run prebuild:android` | the same, Android only (faster) |
| `npm run typecheck` | app only |
| `npm run typecheck:all` | app + `scripts/` + `rules/` — all three have their own tsconfig |
| `npm run lint` | includes the import firewall |
| `npm test` | jest (unit + component) |
| `npm run test:rules` | the 70-case attack matrix against the Firestore emulator |
| `npm run deploy:rules` | Firestore rules + indexes, RTDB, Storage |
| `npm run seed:buildings` | fetch CLSU buildings from OpenStreetMap |
| `npm run firebase:sdkconfig` | re-pull `google-services.json` |
| `npm run firebase:placeholder` | write a fake config for emulator-only work |
| `npm run firebase:emulators` | start the local emulator suite |

---

## Environment variables

Copy `.env.example` to `.env.local`. **Every value has a working default**, so the
app runs with no `.env` file at all. `.env.example` documents each one in full;
these are the ones you are most likely to touch.

| Variable | Default | Why you would change it |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_USE_EMULATORS` | `false` | run against local emulators |
| `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` | per-platform | a **physical device** needs your LAN IP |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | unset | enables the Google Sign-In button — unset means it silently does not render |
| `EXPO_PUBLIC_MAP_STYLE_URL` | OpenFreeMap Liberty | a different tile provider |

> [!IMPORTANT]
> There is deliberately **no `EXPO_PUBLIC_FIREBASE_API_KEY`** (or `PROJECT_ID`, or
> `APP_ID`). This app uses the *native* Firebase SDKs, which read project config
> from `google-services.json` / `GoogleService-Info.plist` at prebuild. There is no
> `initializeApp({ apiKey })` call anywhere, so such a variable would be dead
> config that looks meaningful.
>
> **To point at a different Firebase project:** swap those two files and re-run
> `npx expo prebuild --clean`.

Two wrinkles worth knowing:

- The **Android emulator** reaches your machine at `10.0.2.2`, never `localhost`.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` *is* a Firebase identifier, and it *is* an env
  var, and that is not a contradiction of the box above:
  `GoogleSignin.configure({ webClientId })` is read by **JavaScript**, so it cannot
  come from the native config file. Leave it unset and the Google button simply
  does not render, rather than failing at the tap.

Only `EXPO_PUBLIC_*` is inlined into the bundle, **at build time**, and it is
readable inside the shipped APK. Nothing secret goes there.

---

## Project layout

```
src/
  app/              expo-router routes
    (app)/          the app itself — UNGUARDED, guests get the map
      (tabs)/       map · likes · notifications · profile
    (auth)/         sign in/up, verify, pick a handle — a modal over (app)
  components/       the design system — the ONLY UI surface app code imports
    ui/             base primitives, one vendor boundary each
    layouts/        screen, scroll-view, app-providers, tab-bar-metrics
    common/         app-wide composites that know this app's brand or domain
    forms/          field, text-field
    feedback/       callout, empty-state
  features/         domain logic: auth, buildings, restrooms, likes, reviews, profile
    <domain>/components/   domain components, colocated with their api.ts
  stores/           Zustand state (selector hooks, not Context)
  hooks/            auth listener, campus data subscriptions, location
  lib/              campus constants, firebase init, geo maths, shared types
  __tests__/        screen tests — never beside the route they test

scripts/            Node tooling (OSM building seed, build config). Own tsconfig.
rules/              the security-rules test package. Own node_modules, own tsconfig.
plugins/            Expo config plugins (release signing)
assets/             brand artwork, icons, Lottie animations
```

**Buckets have one rule:** `ui/` wraps exactly one upstream component each and
encodes no brand and no domain. Everything else composes `ui/`.

---

## Data model

Firestore collections, with types in `src/lib/types.ts`:

| Collection | Read | Write |
|---|---|---|
| `buildings` | public | **admin only** — seeded from OSM |
| `restrooms` | public | any signed-in member |
| `reviews` | public | author only, id is `${restroomId}_${uid}` |
| `users` | public | self |
| `users/{uid}/private` | self | self — anything personal lives here |
| `handles` | public | claimed atomically with the profile |
| `follows`, `likes` | owner / member | owner |

`buildings`, `restrooms`, `reviews` and `users` are world-readable so a guest opens
straight onto a working map.

Four invariants the rules enforce — **preserve these if you edit
`firestore.rules`**:

1. **Aggregates are never client-writable.** `ratingSum`, `ratingCount`,
   `photoCount` and the social counters all reject client writes.
2. **Reviews use a composite id**, which is what makes "one review per user per
   restroom" unforgeable without a query or a race.
3. **The verified-student badge derives from the auth token's own claims**
   (`email_verified` + the CLSU domain), never from a client-written field.
4. **`hasOnly()` locks every document shape.** A new field added to the app without
   being added to the rules is rejected. That is the intended failure direction.

There is **no `notifications` collection**, and that is not an oversight — a
notification is written *by* one user *into* another user's inbox, and any rule
permissive enough to allow that is a spam vector. The honest writer is a Cloud
Function, which needs the Blaze plan. The tab ships as an empty state meanwhile.

---

## Architecture notes

<details>
<summary><b>Guest-first routing, and why there is no <code>useEffect</code> + <code>router.replace()</code></b></summary>

<br>

`(app)` is **not** behind a guard. Everyone gets the map; an account is only needed
to contribute. `(auth)` is a modal presented *over* it, gated by `Stack.Protected`.

Screens never navigate after an auth action. `onAuthStateChanged` updates the store
and the guard swaps the tree — which means no flash, and a successful sign-in
returns you to exactly the screen you left, because `(app)` was never unmounted.

The catch, and the reason sign-up, verification and profile creation all live in
*one* group: **`Stack.Protected` only ever REMOVES routes. It cannot present one.**
See the docblock in `src/app/(auth)/_layout.tsx`.

</details>

<details>
<summary><b>Why there is no geohash code</b></summary>

<br>

A multi-city restroom finder needs geohash cells and viewport queries to avoid
loading a planet-scale collection. Scoped to one campus, that machinery is pure
cost: the app opens two `onSnapshot` listeners, keeps everything in memory, and
does filtering and "nearest" sorting as array operations. `src/lib/geo.ts` is ~40
lines of haversine. No geofire, no geo indexes, no read storms.

**Do not reintroduce geo indexing** unless the app's scope actually expands beyond
one campus.

`src/lib/campus.ts` holds every campus constant, all measured from OSM rather than
estimated — including why the default camera is the administrative core and not the
geometric centroid, which sits in CLSU's farmland.

</details>

<details>
<summary><b>Photos: WebP, resized, stripped of metadata</b></summary>

<br>

Uploads are capped at **5 photos per restroom and per review** — every object is
world-readable and immutable by rule, so that ceiling is what bounds the bucket.

Each photo is resized to a 1600px longest edge and re-encoded as **WebP at 0.9**,
which is smaller than the JPEG it replaced *and* looks better. Re-encoding is also
what strips EXIF: a photo taken at a restroom carries the GPS coordinates of the
person who took it, and these images are readable by anyone with the link.

</details>

<details>
<summary><b>Ratings are computed, not denormalised</b></summary>

<br>

Ratings are read live via `getAggregateFromServer`, so **no Cloud Function and no
Blaze plan are needed yet**. `ratingSum` / `ratingCount` already exist on the
document and already reject client writes, so moving to a Function later is
purely additive — no migration, no rules change.

</details>

---

## Conventions

These are **enforced, not aspirational** — `npm run lint` fails on violations.

- **App code imports UI only from `@/components/*`.** Never `react-native`,
  `heroui-native`, `expo-image`, `@legendapp/list` or MapLibre directly. The
  wrappers narrow props and are the single place to change an implementation.
  Provider setup lives in `src/components/layouts/app-providers.tsx` so the rule
  has no carve-outs.

- **200 lines of code per file.** `max-lines` caps every file under `src/`,
  skipping blanks and comments — so it is a cap on code, never on the explanatory
  comments this codebase leans on. When a screen approaches it, decompose: lift
  form state into a `use-*-form.ts` hook, lift repeated chrome into
  `src/features/<domain>/components/`.

- **Compound components.** A non-text component never takes a string child:
  `<Button><Button.Label>Save</Button.Label></Button>`.

- **Native navigators only.** `@react-navigation/stack` and
  `@react-navigation/bottom-tabs` are banned. The floating tab bar is the one
  documented amendment — see [AGENTS.md §1](./AGENTS.md).

- **MapLibre's API surface lives only in `src/components/common/map.tsx`.** v11
  renamed most of v10 (`MapView`→`Map`, `ShapeSource`→`GeoJSONSource`,
  `PointAnnotation`→`Marker`), and most examples online are still v10.

- **Icons are Lucide, imported one file at a time** via
  `@/components/ui/icon`. The barrel import is an ESLint error: Metro does not
  tree-shake, so one root import ships ~1,600 glyphs.

- **Tab screens must add their own bottom inset** with `useTabBarClearance()`. The
  bar floats, so nothing pads a tab screen automatically. This fails *silently*.

---

## Verify before you push

```bash
npm run typecheck:all    # app + scripts + rules (three separate tsconfigs)
npm run lint             # includes the import firewall
npm test
npx expo-doctor          # expect 21/21
npm run test:rules       # 70 security-rule cases — needs Java
```

For anything touching styling, also bundle it — Uniwind failures show up as
unstyled components, not as errors:

```bash
npx expo export --clear --platform android --output-dir <tmp>
```

A `_expo/static/css/global-*.css` of **0 bytes is expected** for native exports:
Uniwind compiles to RN style objects inside the JS bundle, not to CSS. The bundle
itself is Hermes bytecode — [AGENTS.md §9](./AGENTS.md) has the grep recipes for
inspecting it.

---

## CI and releases

`main` is protected. Work happens on `feat/`, `fix/` and `chore/` branches and
merges by PR.

| Workflow | Trigger | Does |
|---|---|---|
| `ci` | every PR + push to `main` | typecheck, lint, test, expo-doctor. Docs-only changes short-circuit every step |
| `firebase-rules` | a rules file changes | runs the attack matrix; deploys on `main` after it passes |
| `native-check` | `app.json` / `package.json` / `plugins/` changes | `expo prebuild` + `assembleDebug` |
| `release` | a `v*` tag | signed APK → GitHub Release with generated notes |

> [!TIP]
> **PR titles become the release notes**, grouped by label via
> `.github/release.yml`. Write them for a reader who was not involved, and label
> the PR — an unlabelled one lands under "Other changes".

<br>

### Cutting a release

```bash
npm version minor --no-git-tag-version   # then match expo.version in app.json
git commit -am "chore: release v1.1.0"
git tag v1.1.0
git push origin main --tags
```

The workflow sets `versionCode` from the run number — monotonic, which Android
requires for in-place upgrades. **Do not set it by hand.**

Release builds need these repo secrets: `GOOGLE_SERVICES_JSON`,
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`.

> [!CAUTION]
> Generate the release keystore **once** and **back it up offline**. Losing it
> means every installed app can never be updated again — Android identifies an app
> by its signature, and there is no recovery.

---

## Troubleshooting

<details>
<summary><b>Gradle fails with "A restricted method in java.lang.System has been called"</b></summary>

<br>

You are on JDK 22+. React Native 0.86 declares `jvmToolchain(17)`. The error names
neither Java nor the version, which is why this is worth writing down.

Install **JDK 17** and re-run `npm run prebuild:android` — it writes
`org.gradle.java.home` into `android/gradle.properties` for you.

</details>

<details>
<summary><b>"SDK location not found… define ANDROID_HOME"</b> — but it <i>is</i> set</summary>

<br>

Gradle reads it from the *process* environment. A terminal opened before you set
`ANDROID_HOME` inherits nothing. Re-run `npm run prebuild:android`, which writes
`sdk.dir` into `android/local.properties`, or just open a fresh terminal.

</details>

<details>
<summary><b>Google Sign-In fails with a bare <code>DEVELOPER_ERROR</code></b></summary>

<br>

The signing certificate's SHA-1 is not registered on the Firebase Android app.
Register it, then regenerate the config and update the CI secret:

```bash
npm run firebase:sdkconfig     # re-pull google-services.json
# then update the GOOGLE_SERVICES_JSON repository secret
```

The debug keystore and the release keystore have **different** SHA-1s. Both need
registering.

</details>

<details>
<summary><b>A code change refuses to appear in the app</b></summary>

<br>

Metro caches transforms per file. If a file's *contents* did not change — an env
var read through `src/lib/env.ts`, for example — its cached transform is reused
with the old inlined value:

```bash
npm start -- --clear
```

</details>

<details>
<summary><b>Components render unstyled</b></summary>

<br>

Uniwind failures are silent — no error, just no styles. Two common causes:

- A token that **does not exist**. heroui-native has no `primary` colour token
  (only a component *variant* of that name) and no `--color-muted-foreground` (it
  is `--color-muted`). `text-muted-foreground` looks right and does nothing.
- A test. Uniwind's Metro transform does not run under jest, so `className`
  produces no styles there. Query by label, role or testID — never by style.

</details>

<details>
<summary><b>Everything fails right after a fresh clone</b></summary>

<br>

You are missing `google-services.json`. It is gitignored because this repo is
public and published Firebase keys get scraped for signup spam. See
[step 3](#3-supply-a-firebase-config).

</details>

<details>
<summary><b><code>npm run test:rules</code> hangs or cannot start</b></summary>

<br>

It needs **Java** on `PATH` for the Firestore emulator, and port **8181** free
(8181 rather than the usual 8080, which is commonly already in use).

`rules/` is a separate npm package with its own `node_modules` — that is
deliberate, not untidiness. `@react-native-firebase` and the Firebase JS SDK each
pull in their own `@firebase/app-compat`, and the duplicate copies break
rules-unit-testing with `getApp(...).firestore is not a function`.

</details>

---

## Project status

**Working**

Guest-first browsing · sign up / in / out · email verification · password reset ·
Google Sign-In · verified-student badge · the write gate · campus map with restroom
pins · restroom submission with photos · restroom and building detail · saved
restrooms · security rules (70 cases, passing) · the OSM seed pipeline.

**Stubbed — safe places to pick up**

- The **review composer** — `src/app/(app)/review/[restroomId].tsx`
- **Notifications** — `src/app/(app)/(tabs)/notifications.tsx`, blocked on Cloud
  Functions ([see above](#data-model))
- **RTDB live status** — the "is it occupied right now" idea

**Deliberately not built**

A feed of strangers' reviews. Five slots is the practical maximum for a bottom bar,
and a feed is weak until there is a real user base. The follow graph, its rules and
its index are all retained; when the query ships it belongs as a *Following* segment
on Profile, not a primary tab.

---

<div align="center">

Built for CLSU 🐃 · Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors

</div>
