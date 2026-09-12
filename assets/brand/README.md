# Brand assets

Source artwork and the export spec for everything under `assets/images/`.

## Put the logo here

```
assets/brand/flushy-flash.svg        full lockup (mark + wordmark)
assets/brand/flushy-flash-mark.svg   the symbol alone, square viewBox
```

`assets/` is fully tracked — nothing in `.gitignore` touches it — so committing
the SVG is enough for it to be usable.

⚠️ **`flushy-flash.svg` still fills the bolt with the pre-darkening `#00a878`.**
Nothing in the app reads that value — `brand-mark.tsx` paints the polygon from
`--color-accent` — so this is cosmetic today. But it is the file the PNG exports
below come from, so **update it to `#00855E` before exporting them**, or the app
icons will ship the old green.

### Why the SVG is not imported directly

There is no `react-native-svg-transformer`, and there deliberately will not be:
`metro.config.js` is already wrapped in `withUniwindConfig`, and a third
transformer layer risks Uniwind's build-time class extraction — which fails by
rendering components unstyled rather than by erroring, so it would be expensive
to diagnose.

The house pattern is to **transcribe path data into a TSX component**
(`src/components/ui/icon.tsx`, `src/components/common/google-mark.tsx`,
`src/components/common/brand-mark.tsx`). That keeps the mark resolution-
independent and, when it is monochrome, theme-tintable through `useCSSVariable`.

`react-native-svg` supports only a subset of SVG. `<filter>`, `mix-blend-mode`
and `<text>` with a custom font are the usual casualties — outline any text to
paths before exporting, and flatten effects.

## PNG exports

Export from the design tool rather than converting here: no rasteriser is
available in this repo (`sharp` is not resolvable, `@expo/image-utils` falls
back to `jimp-compact`, which cannot read SVG), and the design tool renders
effects correctly anyway.

All of these **replace** the same-named file in `assets/images/`, every one of
which is currently an unmodified Expo template asset.

| File | Size | Requirements |
|---|---|---|
| `icon.png` | 1024×1024 | **Opaque. No alpha, no rounded corners** — iOS rejects alpha and applies its own mask. Full-bleed brand background. |
| `android-icon-foreground.png` | 1024×1024 | Transparent. **Glyph inside the centre ~66%** (≈660×660): Android crops this layer to circles, squircles and squares depending on launcher. |
| `android-icon-monochrome.png` | 1024×1024 | Transparent, glyph **fully opaque** in any single colour. Alpha is the mask; the colour is discarded and re-tinted by Material You. |
| ~~`splash-icon.png`~~ | — | **No longer used.** `app.json` sets a solid splash ground and no image, so the native splash hands over to the in-app loading screen with no colour step and no asset. Re-adding an image means re-introducing that seam. |
| `favicon.png` | 196×196 | Web only. |

`android-icon-background.png` is **no longer used** — `app.json` now sets
`adaptiveIcon.backgroundColor: "#00855E"` instead, which removes one hand-
maintained copy of the brand colour.

### What is wrong with the current assets

- `splash-icon.png` was **228×213** — not square, not a power of two — and every
  opaque pixel pure white, which on the old white native background showed
  nothing at all. It is no longer referenced; the splash is a solid colour.
- `android-icon-foreground.png` is 512×512 and drawn at **alpha 1–3 out of 255**,
  i.e. effectively invisible on device.
- The rest are the stock Expo blue chevron, whose `#0072de` has no relationship
  to the brand.

## Palette

Authored in `src/global.css`, which is the single source of truth. These hex
values are for design tools only — **do not** paste them into app code.

| | |
|---|---|
| Primary | `#00855E` |
| Primary, pressed | `#00704D` |
| Brand gradient | `#008F6A → #00C98B → #5BE7B2` |
| Auth backdrop anchor | `#00694C` |
| Splash / app ground (light / dark) | `#F4F6F5` / `#050606` |

**The primary was #00A878 and was darkened on purpose.** White on #00A878 is
only 3.06:1, below the 4.5:1 WCAG AA needs for normal text, which forced a
near-black button label and a dark ring around the tab bar's active pill. On
**#00855E white is 4.65:1**, so labels are white and the ring is gone. The
pressed shade exists because the derived hover colour lightens once the
foreground is white, which would fail AA mid-press.

The brand **gradient keeps its original, lighter stops** — it is decorative and
carries no text, so it was not darkened with the primary. The anchor still
exists because on `#008F6A` white is 4.09:1 and near-black 4.00:1, so *neither*
passes, and the auth header needs somewhere legible to sit.

The splash row is the resolved sRGB of `--background`, which the loading screen
and `app.json` both point at — change it in `global.css` and mirror it there.

## After changing any of this

Icons, the adaptive-icon background and the splash all live in the generated
`android/` tree, which is gitignored and rebuilt from `assets/`:

```bash
npm run prebuild:android
```

Without it nothing here reaches the device — the native project currently still
carries Expo's default `#FFFFFF` splash background.
