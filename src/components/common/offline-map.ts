import {
  OfflineManager,
  type OfflinePack,
  type OfflinePackStatus,
} from '@maplibre/maplibre-react-native';
import { File, Paths } from 'expo-file-system';

import { tilePackStyle } from '@/components/common/map-style';
import { CAMPUS_BOUNDS, MIN_ZOOM } from '@/lib/campus';

/**
 * The campus map, kept on the phone.
 *
 * ⚠️ **This is the second file that names MapLibre APIs.** `map.tsx` used to be
 * the only one, and it stays the only one that names the map VIEW — offline
 * packs are a storage concern with no rendering surface, and folding an
 * imperative download manager into a component would be worse than a second,
 * narrow boundary. `components/common/` rather than `features/` because the
 * import firewall bars app code from the package entirely.
 *
 * ## What the pack contains, and what it deliberately does not
 *
 * **Vector tiles only — no fonts.** That is not a limitation, it is where all
 * the size is. Measured against OpenFreeMap: the planet TileJSON reports
 * `maxzoom: 14`, so everything above z14 is overzoomed client-side and the
 * campus bounds cover roughly four tiles at that level — well under a megabyte.
 * Glyphs are the opposite: MapLibre's offline downloader asks for every range
 * of every fontstack in the style it is given, 256 ranges each, and sampling
 * OpenFreeMap's `Noto Sans Regular` put those ranges at ~93 KB apiece. Two
 * fontstacks is therefore ~40-50 MB of FONT to draw ~1 MB of map, on a phone
 * whose entire APK is 49 MB.
 *
 * So the pack is built from a style with no `glyphs` and no symbol layers, and
 * labels come from MapLibre's **ambient cache** instead — which stores every
 * resource the map fetches during ordinary online use, glyph ranges included,
 * and serves them back when the network is gone. The practical consequence,
 * stated plainly because the UI has to say it: a phone that has opened the map
 * online gets roads, buildings AND their names offline; a phone that never has
 * gets the geometry without the names.
 *
 * ## Why a file:// style rather than the app's own object
 *
 * `OfflinePackCreateOptions.mapStyle` is typed `string`, and Android hands it
 * straight to `OfflineTilePyramidRegionDefinition` as a style URL
 * (MLRNOfflineModule.kt:424) — the offline module bypasses the helper that
 * would have written a style object to a temp file. So the object has to become
 * a URL, and writing it ourselves is also what lets us strip the fonts.
 *
 * Vector tiles are style-independent and every pack shares one SQLite database,
 * so tiles fetched under this stripped style are exactly the tiles the app's
 * real style renders from.
 *
 * ⚠️ That last sentence holds only while the map renders the AUTHORED theme.
 * `map.tsx` exports `MAP_STYLE` (`EXPO_PUBLIC_MAP_STYLE_URL`) as a documented
 * escape hatch for pointing at MapTiler or Protomaps, and nothing consumes it
 * today. If anything ever does, this pack would be downloading OpenFreeMap
 * tiles for a map drawing someone else's — and the symptom is a downloaded map
 * that is still blank offline, with no error anywhere.
 */

/** Identifies our pack among whatever else is in the database. */
export const CAMPUS_PACK_NAME = 'clsu-campus';

/** See `reserveAmbientCache` — this is where the labels live. */
const AMBIENT_CACHE_BYTES = 100 * 1024 * 1024;

/**
 * From OpenFreeMap's planet TileJSON, which reports `maxzoom: 14`.
 *
 * ⚠️ Not `MAX_ZOOM` (19). That is a PINCH limit — vector tiles overzoom, so
 * z14 content serves every zoom above it. Asking for 19 would request five more
 * pyramid levels that do not exist; `createPack` defaults to 10/20, which is
 * why both ends are always passed explicitly.
 */
const SOURCE_MAX_ZOOM = 14;

/** `LngLatBounds` is [w, s, e, n] — longitude first, per AGENTS.md §4. */
const BOUNDS: [number, number, number, number] = [
  CAMPUS_BOUNDS.sw.lng,
  CAMPUS_BOUNDS.sw.lat,
  CAMPUS_BOUNDS.ne.lng,
  CAMPUS_BOUNDS.ne.lat,
];

/** Writes the stripped style and returns the `file://` URI MapLibre needs. */
function styleUri(): string {
  const handle = new File(Paths.document, 'offline-map-style.json');
  handle.write(JSON.stringify(tilePackStyle()));
  return handle.uri;
}

export async function getCampusPack(): Promise<OfflinePack | null> {
  const packs = await OfflineManager.getPacks();
  return packs.find((pack) => pack.metadata?.name === CAMPUS_PACK_NAME) ?? null;
}

export async function deleteCampusPack(): Promise<void> {
  const pack = await getCampusPack();
  if (pack) await OfflineManager.deletePack(pack.id);
}

export function downloadCampusPack(
  onProgress: (status: OfflinePackStatus) => void,
  onError: (message: string) => void,
): Promise<OfflinePack> {
  return OfflineManager.createPack(
    {
      mapStyle: styleUri(),
      bounds: BOUNDS,
      minZoom: MIN_ZOOM,
      maxZoom: SOURCE_MAX_ZOOM,
      metadata: { name: CAMPUS_PACK_NAME },
    },
    (_pack, status) => onProgress(status),
    (_pack, error) => onError(error.message),
  );
}

/**
 * Room for the labels the pack deliberately leaves out.
 *
 * MapLibre's default ambient budget is 50 MB shared with everything else it
 * caches. Glyph ranges are ~93 KB each and this app touches only the Latin
 * ones, so the campus needs a few megabytes — but so does every tile the user
 * pans over, and eviction is LRU. Raising it is cheap (the cache is sized, not
 * preallocated) and is what makes "I used the map yesterday" mean "the map
 * works today".
 */
export function reserveAmbientCache(): Promise<void> {
  return OfflineManager.setMaximumAmbientCacheSize(AMBIENT_CACHE_BYTES);
}

export type { OfflinePackStatus };
