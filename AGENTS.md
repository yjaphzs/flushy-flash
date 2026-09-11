# AGENTS.md — Flushy Flash

Working notes for AI coding agents (Codex, Claude Code, Copilot, Cursor, Amp…).
Human setup docs live in [README.md](./README.md); this file is about **what to do
and not do when changing code here**.

Flushy Flash is a campus restroom finder for **Central Luzon State University**.
Expo SDK 57 + React Native, Firebase backend, MapLibre map, HeroUI Native UI.

---

## 1. Stack decisions that look like mistakes but are not

An agent reading this codebase will be tempted to "fix" these. **Don't.** Each was
chosen deliberately and verified against the packages.

| You might reach for | Use instead | Why |
|---|---|---|
| shadcn/ui, Radix, `@rn-primitives` | **HeroUI Native** (`heroui-native`) | shadcn is built on Radix, which is DOM-only. It cannot render in React Native. |
| NativeWind | **Uniwind** (`uniwind`) | HeroUI Native is built on Uniwind. They are not interchangeable. |
| `tailwind.config.js` | **`src/global.css`** | Tailwind **v4** is CSS-first. A JS config file does nothing here. |
| Tailwind v3 | **Tailwind v4** (`4.3.3`) | Uniwind requires `tailwindcss >= 4`. Downgrading breaks the build. |
| Leaflet, react-leaflet | **MapLibre Native** | Leaflet needs a browser DOM. MapLibre renders natively with the same free OSM tiles. |
| `react-native-maps` | **MapLibre Native** | No API key, no Google dependency, free OSM tiles. |
| Firebase JS SDK (`firebase`) | **`@react-native-firebase/*`** | Native SDKs. There is no `initializeApp({apiKey})` call anywhere — config comes from the native files at prebuild. |
| `@react-navigation/stack` / `bottom-tabs` | **expo-router `Stack` / `NativeTabs`** | Banned. Native navigators only. |
| geohashes, `geofire-common`, viewport queries | **in-memory array + haversine** | See §6. |

### HeroUI Native is NOT HeroUI React

Different package, different styling engine, different color format. Web HeroUI
docs and examples **do not apply**. If you need component docs, fetch the native
ones: `https://heroui.com/docs/native/components/<name>.mdx`.

---

## 2. The import firewall (enforced by ESLint)

App code under `src/app/**` and `src/features/**` may import UI **only** from
`@/components/*`. Blocked: `react-native`, `heroui-native`, `expo-image`,
`@legendapp/list`, `@maplibre/maplibre-react-native`, and both banned React
Navigation packages.

`src/components/**` is exempt — wrapping those packages is its entire job.

This is why provider setup lives in `src/components/app-providers.tsx` rather than
in `src/app/_layout.tsx`: a rule with a carve-out is a rule people stop trusting.
**Do not add an ESLint exception to work around this** — add or extend a wrapper.

`npm run lint` fails on violations. That is the point.

---

## 3. Component conventions

- **Compound components.** A component that is not a text node never takes a
  string child. `src/components/button.tsx` deliberately types string children
  out, even though HeroUI's Button would accept them:
  ```tsx
  <Button variant="primary" onPress={save}>
    <Button.Label>Save restroom</Button.Label>
  </Button>
  ```
- **`isDisabled`, not `disabled`.** HeroUI omits RN's `disabled` and replaces it.
- **`Card` is not pressable.** It extends Surface. Wrap it in `Pressable` to make
  a card tappable — see `src/app/(app)/building/[id].tsx`.
- **`Card.Body`, not `Card.Content`** (that is the web HeroUI name).
- **Lists go through `@/components/list`** (LegendList). `ScrollView` + `.map()`
  is banned even for short lists.
- **Images go through `@/components/image`** (expo-image), never RN's `Image`.
- **Safe area** comes from `contentInsetAdjustmentBehavior="automatic"`, not
  `SafeAreaView` or manual insets.
- Pair every `borderRadius` with `borderCurve: 'continuous'`; prefer `gap` over
  child margins.

---

## 4. API gotchas already paid for

These cost round trips once. Don't rediscover them.

| Thing | Correct form |
|---|---|
| LegendList import | `@legendapp/list/react-native` — the package root has **no** export |
| MapLibre marker | `<Marker id={...} lngLat={[lng, lat]}>` — not `coordinate` and `id` is required |
| MapLibre coords | `LngLat = [longitude, latitude]` and `LngLatBounds = [w, s, e, n]` — lng first |
| `Map` name collision | MapLibre's `Map` component shadows the global `Map` constructor. Use a `Record` instead of `new Map()` in files importing it |
| RNFirebase types | Modular: `import type { User } from '@react-native-firebase/auth'`, `{ Timestamp, GeoPoint }` from firestore. The `FirebaseAuthTypes` / `FirebaseFirestoreTypes` namespaces are **gone** in v26 |
| RNFirebase API | `getAuth()`, `onAuthStateChanged(auth, cb)` — the namespaced `auth().onAuthStateChanged()` is deprecated |
| Config plugins | Only `@react-native-firebase/app` and `/auth` have them. Adding `firestore`/`storage`/`database` to `plugins` throws |
| RNFirebase versions | Every module declares an **exact** peer on `app`. All five bump together |
| NativeTabs | `NativeTabs.Trigger.Label` / `.Icon` via dot notation — not standalone imports. Icons: `sf=` (iOS) + `md=` (Android) |
| `tsconfig` `baseUrl` | Removed on purpose — TypeScript 6 deprecates it and `paths` works without it |
| Node scripts | `scripts/` has its own `tsconfig.json` (Node types, ESM-ish). It is excluded from the app typecheck. `import.meta` is unavailable — resolve from `process.cwd()` |
| Overpass API | Requires a `User-Agent` header or it returns **406** |

---

## 5. Versions: track the SDK, not npm latest

Everything is pinned exactly — **no `^` or `~`**. Where Expo SDK 57 pins a version
(React Native 0.86.3, React 19.2.3, Reanimated 4.5.1, worklets 0.10.1, jest 29…)
use **the SDK's version**, even when npm latest is ahead. `expo-modules-core` is
compiled against the SDK's headers, and going ahead buys nothing.

Reanimated and `react-native-worklets` move **as a pair**.

`npx expo-doctor` passing (21/21) is the check that this still holds. If you add a
dependency and doctor complains, the default answer is to match the SDK, not to
add an `expo.install.exclude` entry.

---

## 6. Why there is no geohash / geo-query code

A multi-city restroom finder needs geohash cells, viewport range queries, cell
caching and pan debouncing to avoid loading a planet-scale collection.

**Scoped to one campus, all of that is pure cost.** CLSU has ~103 buildings and
will have a few hundred restrooms. The app opens two `onSnapshot` listeners
(`src/hooks/use-campus-data.ts`), holds everything in `src/stores/campus-store.ts`,
and does filtering and proximity sorting as array operations. `src/lib/geo.ts` is
~40 lines of haversine.

**Do not reintroduce geo indexing** unless the app's scope actually expands beyond
one campus. If it does, that is a deliberate architectural change, not a tidy-up.

`src/lib/campus.ts` is the single source of truth for campus constants, all
measured from OpenStreetMap rather than estimated — including why the default
camera is the administrative core and not the geometric centroid (which sits in
CLSU's farmland).

---

## 7. Data model and security

Collections: `buildings`, `restrooms`, `reviews`, `users` (+ `users/{uid}/private`),
`handles`, `follows`. Types in `src/lib/types.ts`.

Invariants the rules enforce — **preserve these when editing `firestore.rules`**:

- **Aggregates are never client-writable.** `ratingSum`, `ratingCount`,
  `photoCount` and the social counters reject client writes. Ratings are read live
  via `getAggregateFromServer` (`src/features/restrooms/api.ts`), so no Cloud
  Function and no Blaze plan is needed yet. The fields already exist, so adding a
  Function later is additive — no migration, no rules change.
- **Reviews use a composite id** `${restroomId}_${uid}`. That is what makes "one
  review per user per restroom" unforgeable without a query or a race.
- **The verified-student badge derives from the auth token's own claims**
  (`email_verified` + CLSU domain), never from a client-written field. The
  `users/{uid}.verifiedStudent` field is a display cache that the rules require to
  agree with the token.
- **`hasOnly()` locks every document shape.** A new field added to the app without
  being added to the rules is rejected. That is the intended failure direction —
  add it to the rules deliberately.
- `buildings` is admin-write-only (seeded from OSM).

⚠️ **The rules are written but not yet proven.** They need an emulator suite run
against the attack matrix in the README before real users. If you touch them, that
becomes more urgent, not less.

Email domain (`clsu.edu.ph`) is **unconfirmed** — one constant in
`src/lib/campus.ts` plus one regex in `firestore.rules`.

---

## 8. Layout

```
src/
  app/              expo-router routes. (auth) and (app) groups, gated by
                    Stack.Protected in _layout.tsx
  components/       design system — the ONLY UI surface app code imports
    map.tsx         the ONLY file naming MapLibre v11 APIs
    app-providers.tsx  GestureHandlerRootView + HeroUINativeProvider
  features/         domain logic: auth, buildings, restrooms, reviews, profile
  stores/           Zustand (selector hooks, not Context)
  hooks/            use-auth-listener, use-campus-data, use-current-location
  lib/              campus.ts (constants), firebase.ts, geo.ts, types.ts
scripts/            Node-side tooling (OSM seed). Own tsconfig.
```

Routing gates on `Stack.Protected guard={…}`, which is evaluated before any screen
mounts — no redirect flash, deep links survive the sign-in round trip. **Do not
replace it with `useEffect` + `router.replace()`.** Screens never navigate after
auth actions; `onAuthStateChanged` updates the store and the guard swaps the tree.

---

## 9. Verify before you claim done

```bash
npm run typecheck                          # app
npx tsc --noEmit -p scripts/tsconfig.json  # node scripts (separate config)
npm run lint                               # includes the import firewall
npm test
npx expo-doctor                            # expect 21/21

npm run test:rules                         # security rules — needs Java; emulator on :8181
```

`rules/` is an **isolated npm package** with its own `node_modules`. That is not
tidiness: `@react-native-firebase` and the Firebase JS SDK each pull in their own
`@firebase/app-compat`, and the duplicate copies break rules-unit-testing's compat
layer with `getApp(...).firestore is not a function`. Keeping them apart also
stops the JS SDK ever becoming importable from app code.

For anything touching styling, also bundle it — Uniwind failures show up as
unstyled components, not errors:

```bash
npx expo export --platform android --output-dir /tmp/ff-check
```

A `_expo/static/css/global-*.css` of **0 bytes is expected and fine** for native
exports — Uniwind compiles to RN style objects inside the JS bundle, not to CSS.
To confirm styles really compiled, grep the bundle for RN style property names
(`paddingHorizontal`, `borderRadius`); their presence is the real signal.

**This app cannot run in Expo Go.** `@react-native-firebase/*` and MapLibre are
native modules. Any change to `app.json` plugins, fonts, or native dependencies
needs a fresh `npx expo prebuild --clean` and a rebuild.

---

## 10. CI, branching and releases

**Branching is GitHub Flow.** `main` is protected — PRs only, CI must pass. Branch
prefixes: `feat/`, `fix/`, `chore/`. Never commit directly to `main`; never
force-push a shared branch. Releases come from **tags**, not a release branch.

**Workflows** (`.github/workflows/`):

| Workflow | Trigger | Does |
|---|---|---|
| `ci.yml` | every PR + push to main | The §9 block: typecheck (app + scripts), lint, test, expo-doctor |
| `firebase-rules.yml` | rules/ or `*.rules` change | Runs the attack matrix against the emulator; deploys on main after it passes |
| `native-check.yml` | `app.json`/`package.json`/`plugins/` change | `expo prebuild` + `assembleDebug` — catches native breakage typecheck cannot see |
| `release.yml` | `v*` tag | Signed APK → GitHub Release with auto-generated notes |

**PR titles become the changelog.** GitHub generates release notes from merged PR
titles, grouped by label via `.github/release.yml`. Write them for a reader who
was not involved.

**Cutting a release:** bump `package.json` and `app.json` version, commit, tag
`vX.Y.Z`, push with `--tags`. The workflow sets `versionCode` from the run number
(monotonic, which Android requires for in-place upgrades) — do not set it by hand.

**Android release signing lives in a config plugin**, `plugins/with-release-signing.js`,
not in a patched `android/`. Expo's bare template points `buildTypes.release` at
`signingConfigs.debug`, so a release build is debug-signed out of the box — which
would strand every installed user on the next update. The plugin is a no-op unless
`ANDROID_KEYSTORE_PATH` is set, so local debug builds need no secrets. The release
workflow asserts with `apksigner` that the output is not debug-signed.

**Dependabot is deliberately constrained** (`.github/dependabot.yml`). Left
unconstrained it would bump React Native, React, Reanimated and worklets past the
SDK pins, breaking §5 and failing `expo-doctor`. SDK-owned packages, native
modules, and the HeroUI/Uniwind/Tailwind trio are all on its ignore list — those
move only via a deliberate `expo-upgrade`.

---

## 11. Firebase project (live)

Project `flushy-flash` (number 908364466191), region **asia-southeast1** for both
Firestore and Realtime Database — nearest to Nueva Ecija, and **permanent**.

| Service | State |
|---|---|
| Firestore | Standard edition, Native mode, asia-southeast1. Rules + indexes deployed |
| Realtime Database | asia-southeast1, rules deployed |
| Storage | provisioned, rules deployed |
| Auth | Email/Password **and Google** enabled |

Android app id `1:908364466191:android:56479030081484f70d3b7a`, package
`xyz.yjaphzs.flushyflash`. Both the shared Expo debug keystore and the project's
release keystore have their SHA-1 registered, so `google-services.json` carries
two `client_type: 1` OAuth clients plus the `client_type: 3` web client.

⚠️ **Google Sign-In is enabled in Firebase but NOT implemented in the app.**
`src/features/auth/api.ts` only does email/password, and
`@react-native-google-signin/google-signin` is not installed. Enabling the
provider in the console does nothing on its own. Implementing it needs that
package, `GoogleSignin.configure({ webClientId })` with the `client_type: 3`
client id, and `signInWithCredential(GoogleAuthProvider.credential(idToken))`.

**Any new SHA-1 requires regenerating `google-services.json`** (`npm run
firebase:sdkconfig`) and updating the `GOOGLE_SERVICES_JSON` CI secret. A release
APK signed by a keystore whose SHA-1 is not registered will fail Google Sign-In
with a bare `DEVELOPER_ERROR` and no useful message.

---

## 11. Environment configuration

`src/lib/env.ts` is the single typed entry point; `.env.example` documents every
variable. Only `EXPO_PUBLIC_*` is inlined into the bundle, at build time — it is
readable inside the shipped APK, so nothing secret goes there.

**There is deliberately no `EXPO_PUBLIC_FIREBASE_API_KEY` / `PROJECT_ID` / `APP_ID`.**
The native SDKs read project config from `google-services.json` /
`GoogleService-Info.plist` at prebuild; there is no `initializeApp({ apiKey })`
call in this codebase. Adding those vars would create config that looks meaningful
and does nothing. **Do not add them** — that pattern belongs to the Firebase JS
SDK, which this project does not use. To point at a different Firebase project,
swap those two files and re-run `npx expo prebuild --clean`.

What *is* env-driven: emulator routing
(`EXPO_PUBLIC_FIREBASE_USE_EMULATORS`, `..._EMULATOR_HOST`, per-service ports) and
`EXPO_PUBLIC_MAP_STYLE_URL`. Emulator host defaults are per-platform — the Android
emulator reaches the host at `10.0.2.2`, not `localhost`; a physical device needs
your LAN IP.

`google-services.json` is **gitignored** — the repo is public, and published API
keys get scraped for signup spam and quota burn. CI reads it from the
`GOOGLE_SERVICES_JSON` secret.

Because it is required at prebuild and absent from every fresh clone,
`npm run prebuild` runs `scripts/check-firebase-config.mjs` first. Without it the
failure is a raw ENOENT inside `withAndroidDangerousBaseMod`, which says nothing
useful. The check also catches a package-name mismatch (which would otherwise fail
much later, in gradle) and flags the placeholder config.

`npm run firebase:placeholder` writes a structurally valid fake config so the app
can be built for UI work against emulators with no Firebase account. It refuses to
overwrite a real config, and prebuild warns whenever it is in use.

---

## 10. Current state

Working: auth (sign up/in/out, reset, verified-student badge), campus map with
building pins, building and restroom detail, restroom submission, security rules,
OSM building seed pipeline.

Stubbed — safe places to pick up: the review composer
(`src/app/(app)/review/[restroomId].tsx`) and the feed
(`src/app/(app)/(tabs)/feed.tsx`). The follow graph and fan-out-on-read query are
designed (§7, README) but not built.

Not yet done: photo upload to Storage and RTDB live status.

The rules attack matrix now exists and passes (37 cases, `rules/firestore.test.ts`),
so §7's "written but unproven" caveat is closed. It earned its keep immediately by
catching a real bug: `isAdmin()` read `request.auth.token.admin` directly, which
**raises an evaluation error** rather than returning false when the claim is
absent — it denied, so tests expecting denial had masked it.
