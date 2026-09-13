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
| `@react-navigation/stack` | **expo-router `Stack`** | Banned. Native stack only — see the tabs amendment below. |
| geohashes, `geofire-common`, viewport queries | **in-memory array + haversine** | See §6. |

### The one amendment: TABS use the JS navigator

`src/app/(app)/(tabs)/_layout.tsx` imports `Tabs` from **`expo-router/js-tabs`**,
which is the vendored `@react-navigation/bottom-tabs`. That looks like a
violation of the row above. It is a deliberate, narrow amendment.

**`NativeTabs` categorically cannot render a floating pill.** Nothing on
`NativeTabsProps`, `NativeTabTriggerProps`, `NativeTabOptions`, or the
`unstable_nativeProps` → `TabsHostProps` escape hatch controls corner radius,
horizontal inset, floating position or height. Android's entire native escape
hatch is one boolean (`tabBarRespectsIMEInsets`), and transparency is iOS-only.

**The original rationale does not survive the design.** This row justified itself
as *"these render the real UITabBar / BottomNavigationView, so they pick up
platform behaviour for free"* — and a floating pill discards exactly that on
purpose. Once the native bar is gone the real choice is between correct tab
semantics and a hidden-bar hack, and `tabBar` is the *designed* extension point:
it supplies `state`, `descriptors` and `navigation`, which is what gives genuine
`tabPress` events and one source of truth for the active tab.

**Scope of the amendment, precisely:**

- Native `Stack` stays mandatory everywhere. `@react-navigation/stack` stays
  banned and stays in the ESLint firewall.
- **No dependency was added.** `@react-navigation/bottom-tabs` is not installed;
  expo-router vendors it at `build/react-navigation/bottom-tabs`. So the
  firewall's entry guards a package name that does not exist on disk while the
  live copy is reachable through expo-router — import it as
  **`expo-router/js-tabs`**, since bare expo-router's `Tabs` is `@deprecated`.
- What was actually given up, so nobody rediscovers it: platform scroll-to-top
  (recovered manually via `tabPress`), native accessibility traversal, iOS 26
  liquid glass, Material You tinting, and `tabBarHideOnKeyboard`.

---

### HeroUI Native is NOT HeroUI React

Different package, different styling engine, different color format. Web HeroUI
docs and examples **do not apply**. If you need component docs, fetch the native
ones: `https://heroui.com/docs/native/components/<name>.mdx`.

---

## 2. The import firewall (enforced by ESLint)

App code under `src/app/**` and `src/features/**` may import UI **only** from
`@/components/*`. Blocked: `react-native`, `heroui-native`, `expo-image`,
`@legendapp/list`, `@maplibre/maplibre-react-native`, `react-native-svg`,
`expo-blur`, `uniwind`, and both banned React Navigation packages.

`src/components/**` is exempt — wrapping those packages is its entire job.

This is why provider setup lives in `src/components/layouts/app-providers.tsx` rather than
in `src/app/_layout.tsx`: a rule with a carve-out is a rule people stop trusting.
**Do not add an ESLint exception to work around this** — add or extend a wrapper.

`npm run lint` fails on violations. That is the point.

---

## 3. Component conventions

- **Compound components.** A component that is not a text node never takes a
  string child. `src/components/ui/button.tsx` deliberately types string children
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
- **Lists go through `@/components/common/list`** (LegendList). `ScrollView` +
  `.map()` is banned for data lists. Fixed chrome — a handful of benefit rows, a
  set of amenity toggles — is a plain `.map()` in a `View` and always has been.
- **Images go through `@/components/ui/image`** (expo-image), never RN's `Image`.
- **Safe area.** ⚠️ `contentInsetAdjustmentBehavior="automatic"` is
  **iOS-only** — RN 0.86.3 declares it `@platform ios` (ScrollView.js:319-325) and
  Android drops it, while also running edge-to-edge with a transparent status bar.
  Every Android screen therefore had a top inset of exactly ZERO until
  `useScreenTopClearance()` existed. **`Screen` and `ScreenScrollView` now apply it
  on Android and nothing else should** — pass `topInset={false}` on a screen that
  sits under a native header (it already supplies the offset) or is deliberately
  full-bleed (the map). Never `SafeAreaView`, never a raw `useSafeAreaInsets()`
  outside `layouts/`.
- **Bottom clearance has exactly one source: `components/layouts/tab-bar-metrics.ts`.**
  The tab bar floats over the content, so nothing pads a tab screen automatically
  any more. **Adding a tab screen means adding the inset** — `useTabBarClearance()`
  as `Screen.style` / `ScreenScrollView.contentContainerStyle` bottom padding, or
  inside a `List`'s `contentContainerStyle` so the last row stays reachable rather
  than merely tight. This fails **silently**: content slides under the pill with
  nothing for typecheck, lint or a test to catch. Never hard-code 64 or 12
  anywhere else.
- **Icons go through `@/components/ui/icon`**, which is Lucide imported ONE FILE
  AT A TIME (`lucide-react-native/icons/<name>`). The barrel is an ESLint error:
  Metro does not tree-shake, so one root import ships ~1,600 glyphs. Adding an
  icon is two lines — an import and a `GLYPHS` entry.
- **Animation goes through `@/components/ui/motion`** (Reanimated 4 + worklets,
  both already pinned by the SDK). Three rules that are not style preferences:
  use `sharedValue.get()` / `.set()`, never `.value`, because `app.json` sets
  `experiments.reactCompiler: true` and the compiler cannot reason about a
  mutation through a property setter; never read or write a shared value during
  render; and honour `useReducedMotion()` on every animation — the OS setting is
  an accessibility preference, not a hint. Durations and springs live in that
  file as TS numbers, not as CSS variables, because uniwind compiles to RN style
  objects and cannot animate.

  **A worklet that closes over a plain prop produces a STEP, not a transition.**
  `useAnimatedStyle(() => ({ opacity: selected ? 1 : 0 }))` re-runs on prop
  change and snaps. It looks exactly like no animation at all, and there is no
  error — drive it through a shared value set in an effect.
- **Email addresses and the campus domain go through
  `@/components/common/email-text`** (`<EmailAddress>` / `<CampusDomain>`), which
  tints them `text-link` — **not** `text-accent`, which fails AA as body text
  (§14). `CampusDomain` renders its own `@`, because `CLSU_EMAIL_DOMAIN` is the
  bare domain and a grey sigil welded to a green address looks like a bug.

  **A nested `<Text>` does not inherit the outer run's typography.** HeroUI's
  Text applies its own `type` default of `body` whenever it renders, so a tinted
  run dropped into a `body-sm` sentence silently jumps a size and breaks the
  line. Pass `type` (and `weight` where it differs) to every nested run.
- **Lottie goes through `@/components/ui/lottie`**, which owns the `require()`
  map and substitutes a `Spinner` under Reduce Motion. ⚠️ **The `.lottie` files
  in `assets/animations/` are dotLottie ZIPs and are NOT what ships** — Metro
  does not bundle that extension, and lottie-react-native documents only JSON
  sources. The inner animation is extracted to a sibling `.json`, with the
  `.lottie` kept as the source artefact; the regeneration command is in the
  wrapper's docblock. Same arrangement as `flushy-flash.svg` and `brand-mark.tsx`.
- **Artwork goes through `@/components/ui/illustration`.** Metro resolves an
  asset `require()` statically, so a runtime-built path resolves to nothing;
  keeping the `require()`s in one file also means no call site spells a filename.
- Pair every `borderRadius` with `borderCurve: 'continuous'`; prefer `gap` over
  child margins.
- **200 lines per file, enforced.** `max-lines` in `eslint.config.js` caps every
  file under `src/` at 200 lines, skipping blanks and comments — so it is a cap
  on code, never on the explanatory comments this codebase leans on. A component
  should stay something a human can hold in their head.

  When a screen approaches the cap, the fix is decomposition, not golf: lift form
  state into a `use-*-form.ts` hook beside the feature's `api.ts`, lift repeated
  chrome into `src/features/<domain>/components/`, and promote anything with
  three or more call sites into `src/components/`.

  Tests and `scripts/` are deliberately outside the rule — `rules/firestore.test.ts`
  (the 70-case attack matrix) and `scripts/seed-buildings.ts` are both legitimately
  longer, and an exhaustive test table is not the readability problem this targets.

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
| Config plugins | Only `@react-native-firebase/app` and `/auth` ship one; adding `firestore`/`storage`/`database` to `plugins` throws. **`/auth` is deliberately NOT listed**: its only two mods are `withIosCaptchaUrlTypes` and `withIosCaptchaOpenUrlFix` — both iOS, both for phone-auth reCAPTCHA this app does not use — and it hard-throws unless `ios.googleServicesFile` exists. No iOS app is registered in Firebase, so that plist cannot exist, and listing the plugin broke config introspection (noisy `expo start`, intermittently aborted `expo export`) while contributing nothing to Android. Re-add it **with** the plist when iOS is set up |
| RNFirebase versions | Every module declares an **exact** peer on `app`. All five bump together |
| NativeTabs | **Historical — the app left it** (§1 amendment). If you ever go back: `NativeTabs.Trigger.Label` / `.Icon` via dot notation, icons as `sf=` (iOS) + `md=` (Android), and a raised centre button cannot be a tab (`BottomAccessory` is iOS 26+, `role` is iOS-only, Android has no centre slot). It also wrapped each screen in react-native-screens' `SafeAreaView` — which is why `tab-bar-metrics.ts` used to return 0 on Android |
| JS `Tabs` defaults | They are **not** NativeTabs' defaults. `headerShown` defaults to **true** (four surprise JS headers) and `lazy` defaults to **true** (the map stays unmounted until visited, so a camera command from another tab flies into a null ref). Both are set explicitly in `(tabs)/_layout.tsx` |
| MapLibre camera | `flyTo({ center, zoom, duration })` / `easeTo` / `jumpTo` / `fitBounds` / `setStop`. There is **no `setCamera`** — that is Mapbox v10, and `centerCoordinate` / `zoomLevel` / `animationDuration` are its field names, not v11's |
| `Button isIconOnly` | heroui adds `aspect-ratio: 1`, so the button becomes a square of its SIZE's height: `sm` is **40pt — under the 44pt minimum touch target**, `md` is 48, `lg` is 56. A label hides this by making `sm` wide enough. Also: the wrapper derives no `accessibilityLabel` from `Button.Label` and warns about nothing, so icon-only means you must pass one |
| Photo encoding | **WebP at 0.9**, not JPEG. Lossless (PNG) on a photograph runs 3-6 MB against storage.rules' 8 MB ceiling — lossless is for line art. WebP is smaller than the old JPEG *and* better looking. `photos.ts` (`SaveFormat.WEBP`), `storage.ts` (`CONTENT_TYPE`, and the object extension) must agree: the rules check the ASSERTED contentType, so a mismatched pair passes the rule and confuses every consumer |
| Storage uploads | `metadata.uploadedBy` **must** equal the caller's uid — `declaresUploader()` in `storage.rules` compares them on every create, and omitting it is a flat `permission-denied` with no hint which clause failed. Objects are immutable (`allow update: if false`), so "replace a photo" means a new id. `FirebaseStorageTypes` is **gone** in v26, like the auth and firestore namespaces |
| Map pins | Three APIs, and the choice matters. `Marker` keeps a live RN view per point and its own docs call it the expensive one; `ViewAnnotation` is for STATIC content; `GeoJSONSource` + symbol layer is cheapest but needs images pre-registered in the style sprite, so it cannot show a remote photo. Restroom pins use **`ViewAnnotation`**. ⚠️ **Android rasterises its children into a bitmap**, so an image that has not decoded yet bakes in blank, permanently, with no error — ⚠️ **`ViewAnnotationRef.refresh()` DOES NOT REPAINT THE PIN, on its own.** Natively it is `style.addImage(bitmapId, bitmap)` where `bitmapId` is the child view's React tag — which never changes — followed by `symbolManager.update()`. The sprite is replaced but MapLibre will not re-place a symbol whose own properties are unchanged, so the stale bitmap stays on screen indefinitely. Verified on device: `onDisplay` fires, `refresh()` runs against a live ref, and nothing happens. The only thing that repaints it is a **size** change, because that alters the anchor offset and so is a genuine property change — which is why the zoom morph works and a photo arriving does not. **Re-key the annotation on the photo URL** so the child remounts with a new React tag, hence a new bitmapId. Keep `refresh()` from the image's **`onDisplay`** paired with **`transition={0}`** as well — it is what covers the size-change case. ⚠️ **The library's own doc comment says `onLoad`, and that advice does not work**: expo-image fires `onLoad` from Glide's `RequestListener.onResourceReady`, BEFORE the drawable is attached to the view, and the view is then faded in from `alpha = 0`. `BitmapUtils.viewToBitmap` is a software `draw()` that honours alpha, so a refresh there captures an empty transparent view — the exact blank pin. `onDisplay` is dispatched after attach. Also: `elevation` does NOT survive `v.draw(canvas)`, so a pin can have no drop shadow |
| MapLibre style | `mapStyle` is `string \| StyleSpecification` — it takes a style **object**, which is how `components/common/map-style/` themes the map with no API key and no hosted style. `StyleSpecification` and the other spec types are re-exported from the RN package root; `@maplibre/maplibre-gl-style-spec` is already a direct dependency, so no install |
| OpenFreeMap endpoints | source `https://tiles.openfreemap.org/planet` (TileJSON), glyphs `/fonts/{fontstack}/{range}.pbf`, sprite `/sprites/ofm_f384/ofm`. Fontstacks are **only** `Noto Sans Regular` / `Bold` / `Italic` — naming any other font yields tiles with no labels and no error. Source-layers: `water`, `waterway`, `landcover`, `landuse`, `park`, `building`, `transportation`, `transportation_name`, `place`, `water_name`, `boundary`, `aeroway`, `aerodrome_label` |
| Style filters | A filter hoisted to a bare `const` widens to `string[]` and stops matching `FilterSpecification`'s tuple types — annotate it. Inline in a layer it infers correctly, which is what makes this confusing |
| MapLibre ornaments | `logo` and `attribution` default to **bottom-left**, where the floating bar now is. `OrnamentViewPosition` requires both a vertical *and* a horizontal key, so you cannot nudge only the vertical. They are pinned top-left / top-right: OSM attribution is a licence condition, not chrome |
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
(`src/hooks/use-campus-data.ts`, keyed on `uid` — a detached listener never
reattaches on its own), holds everything in `src/stores/campus-store.ts`,
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
`handles`, `follows`, `likes`. Types in `src/lib/types.ts`.

**Public read, authenticated write.** `buildings`, `restrooms`, `reviews` and
`users` are world-readable so a guest opens straight onto a working map.
`follows` and `likes` stay owner- or member-scoped — who follows whom, and what
someone saved, are behavioural data with no public purpose. `users/{uid}/private`
is where anything personal belongs, and stays self-only.

**There is no `notifications` collection, and that is not an oversight.** A
notification is written BY one user INTO another user's inbox; any rule
permissive enough to let a client do that is a spam vector. The only honest
writer is a Cloud Function with admin credentials, which needs Blaze. When that
lands: `notifications/{id}` with `{ userId, kind, actorId, restroomId, reviewId,
readAt, createdAt }`, `allow create: if false` (server-only), and the one client
write being `affectedKeys().hasOnly(['readAt'])` to mark read. The tab ships as
an empty state so the information architecture is settled meanwhile.

Invariants the rules enforce — **preserve these when editing `firestore.rules`**:

- **A restroom carries its own `location`, and it is clamped to campus.** This
  reversed an earlier decision that restrooms had no geometry — whose reasoning,
  that indoor GPS is floor-blind, is still true and is exactly why the pin is
  PLACED by hand rather than captured. Because it is user-supplied it is
  attacker-controlled, unlike the admin-seeded `buildings.location`, so
  `isOnCampus()` in the rules bounds it. That function duplicates `CAMPUS_BOUNDS`
  in `src/lib/campus.ts`; there is no import across the boundary, so change both.

  ⚠️ **`latitude()` / `longitude()` are METHODS on the rules `latlng` type.**
  `point.latitude` parses as a map key lookup and fails with
  `Type error. Received: [latlng] Expected: [map,path]`, which reads like a
  problem with the value rather than the access.
- **`buildingId` is nullable.** The pin is the source of truth for *where*; a
  building is a label snapped from it. A restroom beside the lagoon belongs to no
  building. When present it must exist — a dangling id renders as "Unknown
  building" forever.
- **Photos are `photoIds`, never `photoCount`.** `photoIds` is a client-written
  list of Storage object PATHS (not download URLs, which expire), capped at 6.
  `photoCount` stays an aggregate: pinned to 0 at create, `unchanged` on update,
  and the delete rule keys off `photoCount == 0` — making it writable would let
  an author delete a restroom other people had photographed. Anything showing a
  count reads `photoIds.length` until a Cloud Function exists.
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

**Campus email is TWO domains** — `clsu.edu.ph` and `clsu2.edu.ph` — and both
are still **unconfirmed** with CLSU.

⚠️ **This used to say "one constant plus one regex", and that was already**
**wrong.** There are exactly two places the predicate LIVES:

- `CLSU_EMAIL_DOMAINS` + `isCampusEmail()` in `src/lib/campus.ts`
- the regex in `isVerifiedStudent()` in `firestore.rules`

The client side used to be three copies of `.endsWith(`@${DOMAIN}`)` —
`tokenVerifiedStudent`, `tokenVoteWeight` and `useIsVerifiedStudent` — which is
three places to miss one. They now all call `isCampusEmail`.

⚠️ **`endsWith` was never the same predicate as the rules regex.** It accepts
`@clsu.edu.ph` with no local part, where the rules require `[^@]+` first; and a
pattern built from the list must ESCAPE the dots or `clsuXedu.ph` matches.
`src/lib/campus.test.ts` pins both, and `rules/firestore.test.ts` pins the same
cases server-side.

⚠️ **A drift between the two is not a wrong badge.** `isVerifiedStudent()` is
the equality target of three rules — `restroomVotes` create, `users` create and
update — so a missing domain is a bare `permission-denied` that breaks PROFILE
CREATION. `syncVerifiedStudent()` in `features/auth/api.ts` is the repair for
accounts created while a domain was unrecognised: the rules pin the stored field
to the token, and `createProfile` is otherwise the only writer, so without it a
widened domain leaves those profiles permanently stuck.

---

## 8. Layout

```
src/
  app/              expo-router routes. (app) is UNGUARDED; (auth) holds the
                    WHOLE account flow in one group — see below.
  components/       design system — the ONLY UI surface app code imports
    ui/             base primitives, one vendor boundary each
                    (icon.tsx = Lucide, illustration.tsx = the 3D artwork)
    layouts/        screen, scroll-view, app-providers, tab-bar-metrics
    common/         app-wide composites that know this app's brand or domain
      map.tsx            the ONLY file naming MapLibre v11 APIs
      floating-tab-bar.tsx  knows this app's routes and its centre action
    forms/          field, text-field
    feedback/       callout, empty-state
  features/         domain logic: auth, buildings, restrooms, likes, reviews
    <domain>/components/   domain components, colocated with their api.ts
  stores/           Zustand (selector hooks, not Context)
  hooks/            use-auth-listener, use-campus-data, use-my-likes, …
  lib/              campus.ts (constants), firebase.ts, geo.ts, types.ts
scripts/            Node-side tooling (OSM seed). Own tsconfig.
```

**Buckets have one rule:** `ui/` wraps exactly one upstream component each and
encodes no brand and no domain. Everything else composes `ui/`. That is why
`map.tsx` is in `common/` and not `ui/` — it is the MapLibre boundary *and* it
knows about the campus, which a primitive must not.

Domain components stay in `src/features/<domain>/components/` rather than a
`components/features/` bucket. That is deliberate: the import firewall is scoped
to `src/features/**`, so moving them would quietly drop them out of it.

**There is no `src/contexts/`.** Nothing in this app is Context-shaped — auth,
campus data and likes are all state, and state lives in `src/stores/`. This file
used to name a map camera handle as the first genuine candidate. It arrived, and
it was **not** Context-shaped either: the tab bar's "find the nearest restroom"
button needs to command a camera that lives on another screen, and that is a
one-shot message, not shared state. It is `src/stores/map-focus-store.ts` — a
monotonic `nonce` so pressing the button twice from the same spot re-fires, which
an equality-compared target coordinate would swallow. The `CameraRef` itself is a
plain `useRef` on the screen that owns the map.

The `useEffect` that flies the camera in `(tabs)/index.tsx` is not the banned
pattern below: it drives an imperative handle rather than navigation, and it
fires on a store transition rather than as a consequence of an auth call.

### Routing: guest-first

`(app)` is **not** behind a guard. Everyone gets the map; an account is only
needed to contribute. **`(auth)` is the one modal over it**, holding the whole
account flow: `join` · `sign-in` · `sign-up` · `forgot-password` ·
`verify-email` · `complete-profile`.

That buys the no-flash property: because a guarded route leaves the navigation
state when its guard goes false, finishing an account makes the modal dismiss
itself back onto the map — and `(app)` was never unmounted, so the user returns
to exactly the screen they left.

#### ⚠️ Why it is ONE group, and must stay one

There used to be a second `(onboarding)` group for `verify-email` and
`complete-profile`, guarded separately at the root. **That could never work.**

**`Stack.Protected` only ever REMOVES routes. It cannot present one.**
`expo-router/build/react-navigation/routers/StackRouter.js` →
`getStateForRouteNamesChange` filters the stack to routes still permitted and
pushes something only when `routes.length === 0`. A newly-permitted route name
is never navigated to.

So a first-time Google user hit this: the credential lands, `status` leaves
`guest`, `(auth)` is filtered out of the ROOT stack and the modal tears itself
down — the "it sent me back to the login screen" — while `(onboarding)` becomes
available with nothing to present it. The only way onward was the "Finish
setting up" button on Profile.

**It regressed when the app went guest-first.** While `(app)` was guarded,
removing `(auth)` emptied the root stack, so the fallback-insert fired and did
the presenting. `(app)` is permanently present now, so it never can again.

One group fixes it because the swap happens in the CHILD stack, where removing
the current screen genuinely does empty `routes`. Two consequences to preserve:

- **The root guard is `status !== 'signedIn' && status !== 'loading'`** — the
  flow exists for every unfinished state, and *available* is not *presented*.
- **The guest stage guard includes `'checking'`.** It keeps the sign-in screen
  and its spinner up during the async profile read, and it stops `routeNames`
  going empty — which would make the fallback push `routeNames[0]` where that is
  `undefined`. Any new status must land in exactly one stage guard.

`unstable_settings.initialRouteName` is relied on being *ignored* mid-flow: the
fallback honours it only when `routeNames.includes(it)`, which is false once the
guest screens are filtered out.

**Do not replace the guard with `useEffect` + `router.replace()`.** Screens never
navigate after auth actions; `onAuthStateChanged` updates the store and the guard
swaps the tree.

There is exactly **one** deliberate `useEffect` + `router.push`, in
`src/features/auth/use-auth-gate.ts`. It is not an auth gate: it resumes the
write the user was attempting before the gate interrupted them, it lives outside
the tree being swapped, and it fires on a store transition rather than on any
`signIn()` call. Anything else of that shape is the banned pattern.

### Who may write

`useCanWrite()` — status is `signedIn`, meaning verified **and** has a profile —
is the single capability every write surface consults. Having a `uid` is no
longer the same as having a usable account. It is mirrored server-side by
`hasProfile()` in `firestore.rules`; the client copy only decides whether a
button is disabled, the rules are the boundary.

---

## 9. Verify before you claim done

```bash
npm run typecheck:all                      # app + scripts/ + rules/ + functions/, four tsconfigs
npm run lint                               # includes the import firewall
npm test
npx expo-doctor                            # expect 21/21

npm run test:rules                         # security rules — needs JDK 21+; emulator on :8181
npm --prefix functions test                # the anon-name picker
```

⚠️ **Two JDKs are required, for different things, and they are not
interchangeable.** `firebase-tools` 15 refuses to start an emulator on anything
below **JDK 21** (`Error: firebase-tools no longer supports Java version before
21`), while React Native 0.86 declares `jvmToolchain(17)` and its CMake tasks
fail on newer JDKs. So the rules/functions emulator needs 21+ and the Android
build needs exactly 17 — `firebase-rules.yml` and `native-check.yml`/`release.yml`
pin them separately on purpose. Locally, point `JAVA_HOME` at 21+ for
`test:rules` and let `npm run prebuild` write the 17 path into
`android/gradle.properties` for gradle.

`rules/` is an **isolated npm package** with its own `node_modules`. That is not
tidiness: `@react-native-firebase` and the Firebase JS SDK each pull in their own
`@firebase/app-compat`, and the duplicate copies break rules-unit-testing's compat
layer with `getApp(...).firestore is not a function`. Keeping them apart also
stops the JS SDK ever becoming importable from app code.

`functions/` is isolated for the same reason: **`firebase-admin` must never
become importable from app code**, and a server-side dependency graph must not
perturb the app's exact SDK 57 pins. It is where account deletion lives — see §7.

For anything touching styling, also bundle it — Uniwind failures show up as
unstyled components, not errors:

```bash
npx expo export --platform android --output-dir /tmp/ff-check
```

A `_expo/static/css/global-*.css` of **0 bytes is expected and fine** for native
exports — Uniwind compiles to RN style objects inside the JS bundle, not to CSS.
(`global-d41d8cd98f00b204e9800998ecf8427e.css` is just the MD5 of the empty
string.) To confirm styles really compiled, grep the bundle for RN style property
names (`paddingHorizontal`, `borderRadius`); their presence is the real signal.

The bundle lands at `_expo/static/js/android/entry-*.hbc` — **Hermes bytecode,
not JavaScript**, so plain `grep` reports "binary file matches" and any pattern
with a wildcard finds nothing. Use `grep -ao`, which reads the string table:

```bash
B=$(ls <out>/_expo/static/js/android/*.hbc)
grep -ao 'paddingHorizontal' "$B" | wc -l   # styles compiled
grep -ao 'glass' "$B" | wc -l               # --theme reached the bundle
grep -ao 'brand-grad-from' "$B" | wc -l     # app-owned tokens registered
```

Screen strings are in there too, so `grep -ao 'Welcome back'` is a cheap check
that a route actually made it into the graph.

**To check the Lucide icons are still tree-shaking, grep for path `key` strings —
not icon names.** Every icon name is a key in `GLYPHS` in
`src/components/ui/icon.tsx`, so `grep -ao 'sparkles'` returns 1 whether or not
the glyph module was bundled: it is a canary that can never fail. Lucide gives
each `<path>` a stable random `key` (`sparkles` is `1s2grr`), which appears only
if that module is really in the graph:

```bash
# pull the keys out of the package, then grep the bundle for them
python -c "import io,re;print(re.findall(r'key: \"([^\"]+)\"', io.open(
  'node_modules/lucide-react-native/dist/esm/icons/croissant.mjs',
  encoding='utf-8').read()))"
```

Last measured: all 8 sampled imported icons present, all 6 sampled non-imported
icons (`anchor`, `airplay`, `banana`, `croissant`, `ghost`, `telescope`) absent.
19 icons cost **+21 KB**. A bundle jump of ~200 KB or more means a barrel import
slipped in and the whole ~1,600-glyph set has landed.

⚠️ **`grep -ao` silently lies about any string containing a non-ASCII
character.** Hermes keeps two string tables — ASCII and UTF-16 — and anything
with a `…`, `—`, `'` or accent lands in the UTF-16 one, where the bytes are
`L\0o\0a\0d\0…`. An ASCII grep returns 0 and reads exactly like "this code was
not bundled". Verified: `Loading campus…` is `ascii=0, utf16=1`, while its
sibling `No buildings loaded yet` in the same component is `ascii=1`.

This bites constantly, because the house copy style uses `…` in every busy
state ("Signing in…", "Saving…"). Check both encodings:

```bash
python -c "
import io; b = io.open(r'$B','rb').read()
for s in ['Loading campus', 'Signing in']:
    print(s, b.count(s.encode()), b.count(s.encode('utf-16-le')))
"
```

**This app cannot run in Expo Go.** `@react-native-firebase/*`, MapLibre and
`@react-native-google-signin/google-signin` are native modules. Any change to
`app.json` plugins, fonts, or native dependencies needs a fresh
`npx expo prebuild --clean` and a rebuild.

### Component tests

The `jest` block in `package.json` carries five settings that exist only so
component tests can run at all. Do not trim them:

| Setting | Why |
|---|---|
| `transformIgnorePatterns` | `heroui-native`, `uniwind`, reanimated and worklets publish ESM only. Without this the first render dies on `Unexpected token 'export'`. |
| `resolver` | `react-native-worklets/jest/resolver.js`, which strips the `.native` extension so `NativeWorklets.native.ts` (needs the real native module) is never loaded. |
| `setupFiles` | `react-native-gesture-handler/jestSetup.js` (`GestureHandlerRootView` calls `RNGestureHandlerModule.install()` on mount and throws without it), then `jest.setup.js`. |
| `moduleNameMapper` | Maps `lucide-react-native/icons/*` to the package's **CJS** build. Adding lucide to `transformIgnorePatterns` cannot work and is not the fix: jest-expo's transform key is `\.[jt]sx?$`, which never matches `.mjs`, so the ESM file is never handed to a transformer at all. |

**`jest.setup.js` mocks `react-native-safe-area-context`** with the mock that
ships inside the package (`jest/mock.tsx`). All three of its entry points fail
off-device — `initialWindowMetrics` is a native constant and is null,
`useSafeAreaInsets()` throws without a provider, and an **unseeded**
`SafeAreaProvider` renders `null` children forever. That last one is the trap:
adding a provider to `AppProviders` to satisfy the test wrapper looks like the
fix and instead produces "unable to find an element with testID" across every
screen test. Production needs no provider from us — expo-router mounts a seeded
one at `ExpoRoot`.

Three more rules that are easy to get wrong:

- **Screen tests live in `src/__tests__/`, never beside the route.** expo-router's
  `require.context` regex (`node_modules/expo-router/_ctx.android.js`) has no
  test-file exclusion, so `sign-in.test.tsx` under `src/app/` registers itself as
  a navigable route.
- **Mock modules with a factory, not automock.** `jest.mock('@/features/auth/api')`
  alone still loads the real module to derive its shape, dragging in
  `@react-native-firebase` and its nested copy of the Firebase JS SDK.
- **Render through `@/test-utils/render`**, which wraps in `AppProviders`. HeroUI
  components read context and otherwise throw `ContextError`. Uniwind's Metro
  transform does not run under jest, so `className` produces no styles — query by
  label, role or testID, never by style.

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

**Release builds are ABI-restricted, and that is where the download size went.**
v1.0.0 shipped a 161 MB APK; 125 MB of it was native libraries across four
architectures, and **x86 + x86_64 alone were 69 MB — 45% of every student's
download, usable only by an emulator**. `release.yml` therefore passes
`-PreactNativeArchitectures=arm64-v8a,armeabi-v7a` on the gradle command line,
which `@react-native/gradle-plugin` turns into `defaultConfig.ndk.abiFilters`
(`NdkConfiguratorUtils.kt:59-62`). Paired with `useLegacyPackaging: true` in
`app.json`, which compresses the `.so` files inside the APK.

Three things about that are easy to get wrong:

- **It is a CLI flag, not `expo-build-properties`' `buildArchs`.** That option
  writes `gradle.properties`, which would narrow every developer's debug build
  and `native-check.yml`'s `assembleDebug` too. Only the release should be narrow.
- **`armeabi-v7a` stays.** minSdk is 24, and a 32-bit Android 7 phone is exactly
  the budget device a CLSU student is most likely to own. Dropping it makes the
  app un-installable for them with no useful diagnostic.
- **A release build can no longer run on an x86_64 emulator.** Debug builds are
  unaffected, which is what emulator testing already uses.

**Per-ABI `splits` were considered and rejected.** They save perhaps another
20 MB and cost: multiple release assets instead of the one deterministic name,
a hand-managed `versionCode` offset per split colliding with the run-number rule
above, and `expo-device` as a third native dependency purely so the updater
could pick the right asset.

**The release also publishes `latest.json`** beside the APK — the manifest the
in-app updater reads. It is served from `releases/latest/download/latest.json`
on **github.com**, deliberately NOT `api.github.com`, which is 60 requests per
hour per IP unauthenticated: a campus shares one public IP, and a 403 there is
indistinguishable from "no update". Authenticating is impossible because
`EXPO_PUBLIC_*` is inlined into the APK, so shipping a token would publish it.

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

**Google Sign-In is implemented** in `src/features/auth/google.ts`
(`@react-native-google-signin/google-signin`, pinned exactly). The flow is
`GoogleSignin.signIn()` → `GoogleAuthProvider.credential(idToken)` →
`signInWithCredential`.

Two things about it are easy to get wrong:

- **The web client id is an env var, and that is not a contradiction of §12.**
  `GoogleSignin.configure({ webClientId })` is read by *JavaScript*, so unlike
  the native SDK's own config it cannot come from `google-services.json`. It
  lives in `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (the `client_type: 3` entry). Unset
  ⇒ the button does not render, rather than failing at the tap.

  ⚠️ **That graceful degradation hides a CI failure perfectly.** `.env.local` is
  gitignored, so a workflow has no copy, and `EXPO_PUBLIC_*` is inlined by Metro
  when gradle bundles the JS — it is not read at runtime. v1.0.0 therefore
  shipped an APK with no Google button and a completely green build: nothing
  typechecks, lints or tests an absent env var. `release.yml` now DERIVES it
  from the `client_type: 3` entry of the `google-services.json` it already
  writes from `GOOGLE_SERVICES_JSON` — no second secret, and it cannot drift
  from the config it came from. **Any new workflow that produces an installable
  build needs that step too.**
- **A first-time Google user has no profile, and cannot be let into the app.**
  `firestore.rules` requires `users/{uid}` to be created *with* a handle, which
  Google does not supply. So the auth store has a fourth status, `needsProfile`,
  and `src/app/_layout.tsx` has a third `Stack.Protected` group,
  `(onboarding)/complete-profile`. `status: 'checking'` covers the one Firestore
  read that decides between them and holds the splash, so neither the app nor the
  onboarding screen flashes. `createProfile` pushes the handle into the store as
  soon as its batch commits — that is what stops email/password signup (where
  `onAuthStateChanged` fires *before* the batch lands) bouncing through
  onboarding.

**Any new SHA-1 requires regenerating `google-services.json`** (`npm run
firebase:sdkconfig`) and updating the `GOOGLE_SERVICES_JSON` CI secret. A release
APK signed by a keystore whose SHA-1 is not registered will fail Google Sign-In
with a bare `DEVELOPER_ERROR` and no useful message.

---

## 12. Environment configuration

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

## 13. Current state

Working: **guest-first browsing** (the map needs no account), auth (sign up/in/out,
email verification, reset, Google Sign-In, verified-student badge), the write gate
and its benefits card, campus map with building pins, building and restroom
detail, restroom submission, saving restrooms (Likes), security rules, OSM
building seed pipeline.

Sign-up is two-phase: email + password, then — after the address is confirmed —
name and @handle. Google skips the confirmation step but still picks a handle,
with the name pre-filled.

The `(auth)` screens use the glass theme over a brand gradient: `--theme: glass`
in `src/global.css`, `@/components/common/gradient` (react-native-svg, chosen
over expo-linear-gradient because it is already autolinked and needs no
rebuild), and `@/components/common/glass-surface`. **That last one exists because HeroUI's glass is
iOS-only** — `GlassView` gates on `Platform.OS === 'ios'` and paints an opaque
fallback everywhere else, so the wrapper drops the layer off iOS and lets the
surface's own translucent token show the gradient through. See §3 for the
200-line rule that shaped how those screens are decomposed.

The bottom bar is a **floating translucent pill**, not a native tab bar — see the
§1 amendment for why, and §3 for the bottom-clearance rule that replaces the
safe-area padding it used to provide. It is also the app's **first animation**:
one accent highlight that springs between `onLayout`-measured item centres, with
press scaling and a cross-fade between two stacked icons per tab. The convention
it set is in §3. Its centre action is **"find me the nearest
restroom"**, which is `pickNearestOpen()` in `src/features/restrooms/nearest.ts`:
nearest *building* with an `status === 'ok'` restroom, because `Restroom` carries
no coordinates and indoor GPS is floor-blind anyway. It needs no account. "Add a
restroom" moved off the centre slot to a compact button on the map and a row on
Profile, so the contribution path did not leave with the FAB.

**Map chrome has one home per corner**, and it is deliberate: status banners
across the TOP, the add button bottom-right, and the MapLibre ornaments
bottom-left above the pill. The ornaments were at the top until the banners
needed that band — **OSM attribution is a licence condition**, so wherever it
goes it must be genuinely visible, and `OrnamentViewPosition` takes one vertical
AND one horizontal key, so it cannot be nudged on a single axis.

**Nearest-search banners clear themselves.** `dismiss()` sat in
`map-focus-store.ts` unused for a long time, so every outcome stayed on screen
until the app restarted and stale alerts stacked up. Settled outcomes now expire
on a timer; `CampusStatus` deliberately does **not**, because it describes what
the map IS rather than reporting a finished event.

**The search is attempt-tagged.** `getCurrentFix()` takes no abort signal, so
cancelling the dialog cannot stop the request — only disown it. `begin()` returns
a generation, `succeed`/`fail` ignore stale ones, and `cancel()` bumps it. That
is what stops a late fix reopening a dismissed dialog or flying the camera
somewhere nobody asked to go. `map-focus-store.test.ts` covers it.

**A pin shows the restroom's own first photo**, and tapping it opens a bottom
sheet rather than navigating — the map stays behind it, which is the point.
`/restroom/[id]` survives for deep links, notification taps and the full review
list. ⚠️ **They were supposed to share `restroom-detail.tsx` so they could not
drift — and they already have.** `/restroom/[id]` imports none of those components
and hand-rolls its own title, rating card and amenity chips; it renders no photos at
all. Extracting a shared `restroom-summary.tsx` is outstanding work, not a
description of the code.

Storage paths, not download URLs, are what the document stores — a URL carries a
token and goes stale. `use-photo-url.ts` resolves them and memoises **by path,
process-wide**, so the pin and the sheet share one request per image. It is
keyed rather than cleared in an effect: the React Compiler lint rejects a
synchronous setState there, and clearing would flash the previous pin's photo
for a frame.

The sheet shows only data that exists. The reference design's "Trust %" and
drive/walk times were dropped on purpose — there is no source for either, and a
heuristic rendered as a percentage reads as a measurement.

Push notifications are **blocked on Blaze** — a client cannot write into another
user's inbox without opening a spam vector, so the only honest sender is a Cloud
Function (see §7).

Stubbed — safe places to pick up: the review composer
(`src/app/(app)/review/[restroomId].tsx`) and notifications
(`src/app/(app)/(tabs)/notifications.tsx`, blocked on Cloud Functions — see §7).

## The trust system: who may add, and who decides what stays

A restroom starts **pending**. The community confirms it into **verified**, or
reports it into **hidden** and then gone. One account may hold **3 pending**
restrooms at a time; verified ones do not count, so contributing well costs
nothing and contributing junk stalls at three, because nobody confirms junk.

```
        create                2 student confirms (or 1 admin)
  ---------------> PENDING -------------------------------------> VERIFIED
   (max 3 per user)   |                                        (frees a slot)
                      | 3 reports, OUTNUMBERING the confirms
                      v
                   HIDDEN ------- 7 days -------> DELETED
```

`restroomVotes/{restroomId}_{uid}` carries
`{ restroomId, voterId, kind, byStudent, byAdmin, createdAt }`. Five things
about it are decisions, not detail:

- **`byStudent` / `byAdmin` are client-written and rules-FORCED** to equal
  `isVerifiedStudent()` / `isAdmin()`, the same trick `users.verifiedStudent`
  uses. Without it any throwaway Google account mints itself student weight and
  two of them verify a fake.
- **There is no update path**, exactly like `likes`. Changing your mind is a
  delete then a create. An editable vote would let `byStudent` be re-evaluated
  against a token that has since changed.
- **Reads are owner-scoped, unlike every other public collection here.**
  Learning who reported your restroom is the beginning of retaliation, and a
  handle on this campus is a name. Only the aggregate is public, on the
  restroom.
- **An ordinary confirmation counts but scores zero.** `confirmCount` is what
  the UI shows ("3 people found this", which is true); `trustScore` is
  `2 x admin + 1 x verified student` and is what promotes. `confirmCount >
  trustScore` is the normal case, not a bug.
- **Reports must OUTNUMBER confirmations**, not merely reach three. A confusing
  entrance is not a fake one, and hiding leads to deletion a week later.

⚠️ **`verified` is server-only now, and the update rule is author-or-admin.**
It used to be that ANY verified CLSU student could edit ANY restroom — its
location, its landmark, its `verified` flag — and nothing in the app ever
called it, so the affordance existed only as a way to launder a fake onto the
map. An existing rules assertion asserted exactly that and is now inverted.
Community input arrives as votes, which are attributable and countable; a
silent edit is neither.

⚠️ **`hiddenAt` is a separate field and must not become a `status` value.**
`status` (`ok`/`out_of_order`/`closed`) is the restroom’s real-world condition
— `nearest.ts` filters on it, `StatusChip` renders it — and whether a toilet
works is orthogonal to whether anyone believes it exists.

### The cap, and the race it admits

Rules cannot count a collection, so the count is a field:
`users/{uid}.pendingRestroomCount`, maintained by `onRestroomWritten` and read
by the create rule.

⚠️ **The rule reads it as `.get('pendingRestroomCount', 0)`, not directly.**
Reading an absent key is an evaluation error in rules rather than zero, and
every profile written before this lacks the field — the same trap `isAdmin()`
documents. The same reason `pinned()` exists beside `unchanged()`:
`unchangedKeys()` omits a key absent on BOTH sides, so pinning a newly-added
field with `unchanged()` would deny every future edit of an older document.

**The counter trails reality by the trigger’s latency**, so a scripted burst
can briefly exceed the cap. That is accepted, not overlooked: the count
converges, the account is then stuck below the cap until it deletes something,
and the report path removes the junk anyway. An exact version needs slot ids
(`${uid}_0..2`), which would change every Storage path under `restrooms/{id}/`.

### Bootstrapping, and why the admin claim finally exists

`isAdmin()` is checked in nine places and, until now, **granted nowhere** — no
`setCustomUserClaims` call existed. That became load-bearing: with no admin and
no confirmed `@clsu.edu.ph` accounts, nothing could ever be verified, every
contributor would hit the cap permanently, and the map would stop growing.
`npm run grant:admin -- --email you@example.com` fixes it, and an admin
confirmation scores 2 so one is enough.

⚠️ **A custom claim does not reach a signed-in device until its token
refreshes** (up to an hour). Sign out and in, or call `refreshClaims()`.

### The client half

`TrustRow` is shared by the map sheet and `/restroom/[id]`, beside the other
shared pieces, because two surfaces showing the same entity is how they drift.
`DeleteRestroomRow` carries its own dialog, like `delete-account-row.tsx`, and
**renders nothing** once the entry has a review or a confirmation — the rules
refuse the delete then, so the button could only ever fail.

⚠️ **`byStudent` / `byAdmin` come from `tokenVoteWeight()`, never the auth
store.** The store follows the local `User` object, which flips `emailVerified`
long before the ID token rotates; the rules compare against the token and demand
equality, so a value guessed from the store is a flat `permission-denied` with
nothing to say which clause failed. Same trap `tokenVerifiedStudent` documents.

⚠️ **Changing a vote is delete-then-create, and `castVote` does both.** `setDoc`
over an existing vote is an UPDATE as far as the rules are concerned, and update
is denied outright — so switching confirm to report without the delete fails
rather than flipping.

**The submit form counts pending restrooms from `campus-store`**, not from
`users/{uid}.pendingRestroomCount`. The store already holds every restroom, and
more importantly the counter trails the trigger by a second or two: when the two
disagree, the client is showing the truth and the counter is catching up.
`PENDING_CAP` duplicates `pendingCap()` in the rules — no import crosses that
line, so they move together or not at all, exactly like `CAMPUS_BOUNDS`.


### Cleanup, which never existed before

`onRestroomDeleted` removes a restroom’s reviews, votes, likes and Storage
prefix. Deleting a restroom used to orphan all of it — nobody noticed because
nothing could delete one: the rules permitted it and no client ever called it.
Hanging it off the trigger means the author deleting their own entry and
`purgeHiddenRestrooms` share one path.

⚠️ **A restroom reviewed or voted on before the trigger deployed still reads 0**
until the next write. `npm run backfill:trust` exists because that is fine for
the vote aggregates and NOT fine for `pendingRestroomCount`: until it runs, the
cap does not apply to the people who have contributed most.

**The map pin carries `★ 4.2 ·12`, maintained by a Cloud Function.**
`functions/src/rating-aggregate.ts` recomputes `restrooms.ratingSum` /
`ratingCount` on every `reviews/{reviewId}` write. Three things about it:

- **It RECOMPUTES rather than applying a delta**, which costs one query per
  review write and buys correctness that a delta cannot. Functions deliver at
  least once, so a retried delta double-counts permanently and silently; a
  dropped one under-counts forever. Recomputation heals on the next write.
- **The rating is in the annotation's `key`.** Android bakes a ViewAnnotation's
  children into a bitmap and does NOT repaint on a content change (§4), so a
  rating arriving on a live snapshot would otherwise never appear.
  `pinRatingKey` rounds to the decimal the caption prints, so a 0.004 drift
  does not remount every visible pin.
- **It rides the EXISTING 26pt caption row**, because `pin-zoom.ts` derives
  `MAX_PINS` from ~574 KB per card bitmap at the current 140×114 geometry.
  Growing the card invalidates that arithmetic.

⚠️ **A restroom reviewed BEFORE the trigger deployed still reads 0** until
someone writes a review on it — the trigger only fires on a review write. That
is why `pinRating()` returns null at `ratingCount === 0` rather than an average
of zero, and why `score-bar.tsx` still pays for `getAggregateFromServer`
instead of reading the document.

`score-bar.tsx` was also docblocked as **cleanliness** with a Dirty/Acceptable/
Clean axis while calling `fetchRatingSummary`, which averages `rating`. The
data was right and the words were wrong; the axis now reads Poor/OK/Great.

**Profile is a curved brand band with the avatar straddling its lower edge**,
decomposed into `src/features/profile/components/`. Three things about it are
decisions rather than styling, and each has a measurement behind it:

- **The name sits BELOW the gradient, not on it.** White on the brand ramp is
  6.72:1 on the anchor but **4.09 / 2.16 / 1.55** on `from` / `via` / `to`, so
  in light mode only the anchor carries white text — and the anchor is not part
  of the decorative ramp (§14). Text on `--background` sidesteps the question.
- **The band follows the colour scheme and must keep doing so.** It runs under
  the status bar, whose text the OS paints to match the scheme: light mode is
  black on #00926C at **5.33:1** ✓, but a scheme-independent `--nav-*` band
  would be white on the same colour at **3.94:1** ✗. Dark mode fading to a soft
  vignette is the price of a legible status bar, not an oversight.
- **The stats strip shows Saved and Added and deliberately NOT reviews.**
  `reviewCount` is pinned to 0 by the rules until a Cloud Function maintains it
  (§7); a stat that is always zero reads as a measurement and is worse than an
  absent one. Both numbers are derived from stores already in memory.

Rows map only to destinations that exist. **Edit profile** (no such screen),
**My reviews** (nothing queries reviews by author) and **Delete account** (it
lives in Settings, with the destructive actions) are absent on purpose. The
guest branch was moved verbatim and NOT restyled — it is built on
`JoinBenefits`, which is shared with `/join` and the submit gate.

The feed tab is **gone**. Five slots is the practical maximum for a bottom bar,
and a feed of strangers' reviews is weak until there is a real user base. The
follow graph, its `follows` rules and its index are all retained; when the
fan-out-on-read query ships it belongs as a Following segment on Profile, not a
primary tab.

**Restrooms are the map's unit, not buildings.** Each carries its own
`location`, placed by hand on a FULL-SCREEN placer, `app/(app)/pick-location.tsx`
— a pin fixed at screen centre with the map panning beneath it. MapLibre's only
draggable annotation rasterises its children on Android, so a fixed centre is
both more robust and the pattern every place-picker uses.

It used to be a 280pt map embedded in the submit form, which put a pan gesture
inside a ScrollView and left almost no room to aim. The placer is a
`fullScreenModal` SIBLING of `/submit` rather than a replacement, because the
form holds picked photos as local file URIs and must not unmount; the chosen
point returns through `stores/pin-draft-store.ts`, whose nonce is read during
RENDER rather than in an effect. The form then shows a rendered PNG thumbnail
(`StaticMapImageManager`), not a second GL surface.

The ~95 seeded OSM buildings **no longer draw a pin**. They are a label snapped
from the dropped pin within ~80 m, and nullable. The visible consequence is that
**the map is empty until someone adds a restroom** — `CampusStatus` says so
explicitly, because a working map with no pins is indistinguishable from a broken
one.

**Photos** go through `src/features/restrooms/photos.ts` (pick + resize to a
1600px longest edge, re-encoded as JPEG, which also strips the EXIF GPS of
whoever took it) and `src/lib/storage.ts` (upload). The submit order is **reserve
id → upload photos → write the document**, because the object path contains the
id. A failure after upload orphans bytes, which are deleted best-effort; the
opposite ordering would leave `photoIds` pointing at objects that never existed,
which is a visible broken state rather than an invisible wasted one.

**The map is a hand-authored theme**, not a hosted style:
`src/components/common/map-style/` builds a `StyleSpecification` object over
OpenFreeMap's keyless vector tiles, in light and dark, following
`useColorScheme()`. `map-style.test.ts` runs the official MapLibre validator over
both — worth keeping, because an invalid layer does not throw, it silently
vanishes from the map.

**Cold start shows a loading screen**, not `null`. `_layout.tsx` used to
`return null` until auth hydrated, which meant `AppProviders` — and so uniwind's
theme context — did not exist during the hold, so nothing themed could be drawn.
The tree now mounts immediately and `LoadingScreen` is an absolute layer on top
of it; only `(app)` mounts at `status === 'loading'` since neither guard matches,
so the map warms up behind the logo. `useSplashGate` adds a 900ms floor because
a signed-out cold start resolves `hydrated` synchronously and would otherwise
flash. The native splash is a solid `--background` with **no image**, so the
handoff into the JS screen has no colour step.

`assets/brand/flushy-flash.svg` is the real logo and `BrandMark` now draws it —
one `<polygon>` on a 160×160 viewBox, transcribed verbatim so a diff against the
source file is a string comparison. It takes a `variant`: `tile` reverses the
bolt out of an accent tile (the app-icon form), `bare` draws it in brand green
with no tile (what the artwork does, and what the loading screen uses).

The **PNG exports listed in `assets/brand/README.md` are still outstanding**, so
`assets/images/` is the stock Expo chevron — the icons, not the splash, which no
longer references an image. Those need `npm run prebuild:android` after they
land, and so does the splash colour change already made.

Not yet done: photo upload to Storage and RTDB live status.

The rules attack matrix now exists and passes (70 cases, `rules/firestore.test.ts`),
so §7's "written but unproven" caveat is closed. It earned its keep immediately by
catching a real bug: `isAdmin()` read `request.auth.token.admin` directly, which
**raises an evaluation error** rather than returning false when the claim is
absent — it denied, so tests expecting denial had masked it.

---

## 14. The palette, and the two contrast traps in it

Brand primary is **#00855E**; the brand gradient is **#008F6A → #00C98B →
#5BE7B2**. Everything is authored in `src/global.css` at hue **164.26** — set the
BARE tokens (`--accent`, `--surface`), never `--color-*`, which heroui-native
derives.

**The accent was #00A878 and was deliberately darkened.** That is the single
most likely thing for a future agent to "fix" back. Do not. #00A878 is too light
to carry white, and two separate problems traced to it:

| | #00A878 | #00855E |
|---|---|---|
| White label | **3.06** ✗ AA needs 4.5 | **4.65** ✓ |
| Map count-badge text, 12px | **3.06** ✗ | **4.65** ✓ |
| Tab bar active circle vs light pill `#FAFDFC` | **2.98** ✗ 1.4.11 needs 3.0 | **4.54** ✓ |
| Tab bar active circle vs dark pill `#212927` | 4.87 ✓ | **3.20** ✓ |

So `--accent-foreground` is now **white**, and the 1px dark ring the active tab
circle used to carry is **gone** — it existed only to buy back that 0.7%, and
with the darker accent the circle clears the criterion unaided.

⚠️ **The dark-mode circle at 3.20:1 has only 6.7% of margin**, and it is measured
against the map's dark ground `#14181A` in
`components/common/map-style/palette.ts`. Lightening that colour breaks the tab
bar, in a different file, with nothing linking them —
`map-style.test.ts` asserts the luminance ceiling for exactly that reason.

**The press state must be set by hand.** heroui derives
`--color-accent-hover` as `color-mix(in oklab, var(--accent) 90%,
var(--accent-foreground) 10%)`. With a white foreground that mix *lightens*, to
`#1A916E`, where white measures **3.95:1** — the button would fail AA precisely
while being pressed. `global.css` therefore pins `--accent-hover` to
`oklch(48% 0.110 164.26)` (#00704D, white 6.13:1) and overrides
`--color-accent-hover` to point at it.

That is the **second** deliberate `--color-*` override, and it is safe for the
same reason as the first: verified a leaf. `theme.css:67` is its only definition
and nothing derives from it. Do not generalise the exception any further.

**The gradient is stuck mid-scale.** On its darkest stop #008F6A, white measures
4.09:1 and near-black 4.00:1 — *neither* passes. So `--brand-grad-anchor`
(#00694C, white 6.72:1) exists purely to sit under the auth header.
`BrandGradient` takes a `variant`: `backdrop` uses the anchor, `brand` is the
three specified stops for decorative use. **The anchor is not part of the brand
ramp** — do not add it to decorative fills.

**The anchor is a repeated stop, forming a flat BAND, and that is load-bearing.**
As a single stop at y=0 it starts interpolating immediately, and the header text
does not live at y=0 — the wordmark and tagline occupy roughly y=0.17–0.32. A
point-anchor measured 3.96:1 there, falling to 2.92:1 (the tagline carries
`opacity-90`, which costs a further ~12%). Held flat to 0.32 the same text
measures 5.69:1. Five stops from four colours. **If you shorten the band,
re-measure the header — do not assume the anchor colour protects it.**

**Every card-borne colour is tuned against the card over the ANCHOR, not the
pale end it appears to sit on.** `layouts/screen.tsx` mounts `backdrop` outside
the `ScrollView`, so the gradient is fixed while the card scrolls — and with the
keyboard open the card can be dragged to the top of the gradient. The governing
composite is `#cee3dd` light / `#184538` dark. That is why `--danger`, `--link`
and `--field-placeholder` are darker than they look like they need to be:
`--danger` measures 4.03 at its old 55% lightness there, and 4.94 at 50%.

**The dark ramp runs the opposite way to light** — deep at the top, then *darker*
toward the bottom — and that direction is load-bearing. The glass card is 55%
opaque and takes its colour from whatever it sits on: over a light bottom stop it
lifts to ~#185845 and `--muted` falls to 3.82:1 with `--danger` at 3.11:1, both
failing. Over the current ramp the card lands near #192722 and they measure 7.11
and 5.79.

`--danger`, `--warning` and `--success` deliberately keep their own hues. Status
colour that follows the brand hue stops being status colour.

### `text-accent` is still not usable as body text

Darkening the accent fixed white-ON-accent. It did **not** make the accent
readable AS text — measured against the real composited surfaces:

| | on background | on card |
|---|---|---|
| `text-accent` light | **4.28** ✗ | 4.54 |
| `text-accent` dark | **4.36** ✗ | **3.53** ✗ |
| `text-link` light | 6.75 ✓ | 7.15 ✓ |
| `text-link` dark | 13.06 ✓ | 10.56 ✓ |

So **`--link` is the emphasis token for any tinted text run** — same brand hue
164.26, at a per-scheme lightness that survives a dark card. `text-accent` is for
glyphs, fills and the one-character mark in the splash tagline. This is the third
time this trap has been hit; `@/components/common/email-text` is where the
decision now lives for addresses and the campus domain.

### `--on-accent` is now the same white as `--accent-foreground`

It used to be a separate, carefully-hedged token: white-on-accent was 3.06:1,
which cleared WCAG 1.4.11's 3:1 for non-text and nothing more, so it was labelled
"icons only, never a text label". The darker accent retired that warning — white
is 4.65:1 now and a label is fine.

The token survives because the two carry different **intent**, not different
values: `--accent-foreground` is whatever heroui paints on an accent fill,
`--on-accent` is what this app paints on one it drew itself. If they ever need to
diverge, that is the seam. Do **not** reintroduce `--on-brand` for this job —
it exists for the brand *gradient* and measures worse on the accent than plain
white does.

**If you restyle the tab bar pill, re-measure the active circle.** A lighter
pill material makes the contrast worse, not better, and there is no ring left to
absorb it.

### Colours duplicated outside global.css

Three, each of which drifts silently. Change them together:

| Where | What |
|---|---|
| `src/components/common/gradient.tsx` | `FALLBACK`, light and dark sets. Only appears when uniwind cannot resolve a variable — which it reports as a `__DEV__` warning only, so a wrong value ships looking fine. |
| `app.json` | splash `backgroundColor` / `dark.backgroundColor`, and `adaptiveIcon.backgroundColor` |
| `src/components/common/brand-mark.tsx` | two `fill` fallbacks, sRGB copies of `--accent-foreground` (tile) and `--accent` (bare) |
| `src/components/common/restroom-pin-body.tsx` | the map pin's `accent` fallback, an sRGB copy of `--accent`. Only appears if uniwind cannot resolve the variable — a `__DEV__` warning and nothing else, so a wrong value ships looking fine |
| `src/components/common/map-style/palette.ts` | the whole map palette. Mostly colours with no app token (water, roads, buildings), so this is the honest home rather than a leak — but `campus` is brand-derived and `land` is load-bearing for the tab bar |
| `app.json` splash `backgroundColor` / `dark` | must equal the resolved sRGB of `--background`, which `--color-splash-ground` aliases. Two seams depend on it: native→JS handoff and the fade that reveals the app |

`src/components/common/google-mark.tsx` holds Google's four brand hexes and is
**not** ours to recolour.

### `color-mix()` is evaluated in sRGB, and drops alpha

heroui writes every derived token as `color-mix(in oklab, …)`. **Uniwind does
not honour that.** `uniwind/src/core/native/native-utils.ts` ends in
`formatHex(interpolate([mixColor, color])(weight))`, and culori's `interpolate`
defaults to **rgb** — so the `in oklab` never happens at runtime. `formatHex`
(not `formatHex8`) also **discards alpha**, so every two-colour mix comes out
opaque even when the input token carries alpha. Only the `…, transparent)`
branch preserves it.

The consequence that bit: `--color-accent-soft-foreground` is the **secondary
Button label** (11 call sites here) and mixed in sRGB it lands too close to the
`--default` fill beneath it — 3.37:1 light, 3.99:1 dark. `src/global.css`
therefore overrides it via an app-owned `--accent-soft-fg`.

**That override is the one deliberate exception to "never set `--color-*`"**, and
it is safe for a specific reason: the token is a *leaf*. Eight component
stylesheets read it and nothing derives from it, so no `color-mix()` chain is
orphaned — unlike writing `--color-surface`, which would break five. Do not
generalise the exception.

### Tokens that do not exist

heroui-native has **no `primary` colour token** (only a component *variant* of
that name) and **no `--color-muted-foreground`** (it is `--color-muted`). Classes
naming those render uncoloured, silently. Three such bugs were found and fixed
during the recolour; if you write `text-muted-foreground` out of habit it will
look like nothing happened.

Brand source artwork and the icon export spec live in `assets/brand/README.md`.
