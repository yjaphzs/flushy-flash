import { useEffect, useState } from 'react';

import {
  StaticMapImageManager,
  toLngLat,
  useMapStyle,
  useMapStyleId,
} from '@/components/common/map';
import type { LatLng } from '@/lib/campus';

/**
 * The snapshotter can hang forever, so we impose a deadline.
 *
 * ⚠️ Not defensive programming — a documented bug. `MLRNStaticMapModule.kt`
 * handles a snapshot failure with `Log.w` and drops the entry; it never calls
 * `promise.reject`. On a dead campus connection the await simply never
 * settles, and without this the preview would be a spinner that spins for the
 * life of the screen.
 */
const TIMEOUT_MS = 6000;

/** Zoom for the thumbnail — close enough to place the pin in context. */
const PREVIEW_ZOOM = 17;

export type StaticMap = { uri: string | null; failed: boolean };

/**
 * A rendered PNG of the map around `point`.
 *
 * Uses the app's OWN themed style object rather than a stock URL, so the
 * thumbnail matches the map everywhere else and follows light/dark. The native
 * side accepts `string | object` and runs `Style.Builder().fromJson`.
 *
 * ⚠️ `width`/`height` are **DP, not pixels** — the Kotlin applies the device
 * pixel ratio itself (`TypedValue.applyDimension(COMPLEX_UNIT_DIP, …)`). Pass
 * layout points.
 */
export function useStaticMap(
  point: LatLng | null,
  size: { width: number; height: number },
): StaticMap {
  const mapStyle = useMapStyle();
  const styleId = useMapStyleId();
  const [result, setResult] = useState<{ key: string; uri: string | null } | null>(null);

  /*
    Keyed so a moved pin, a resize or a THEME change re-renders, and so the
    answer is derived rather than reset in an effect body.

    ⚠️ `styleId` is in here because the comment above it used to claim "a
    scheme change re-renders" while the key contained no scheme at all — so
    this thumbnail kept whatever palette it was first baked with until the pin
    moved. Now that the theme is a user setting rather than an OS one, that
    would be a picked setting visibly not applying.
  */
  const key = point
    ? `${point.lat.toFixed(6)},${point.lng.toFixed(6)},${size.width}x${size.height},${styleId}`
    : null;

  useEffect(() => {
    if (!point || !key) return;
    let live = true;

    const snapshot = StaticMapImageManager.createImage({
      center: toLngLat(point),
      zoom: PREVIEW_ZOOM,
      mapStyle,
      width: size.width,
      height: size.height,
      output: 'file',
      // MapLibre does not require its logo, and it is unreadable at this size.
      // OSM attribution is carried as a caption beside the thumbnail instead,
      // and in full on the placer where it is genuinely legible.
      logo: false,
    });

    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS));

    Promise.race([snapshot, timeout])
      .then((uri) => live && setResult({ key, uri: typeof uri === 'string' ? uri : null }))
      .catch(() => live && setResult({ key, uri: null }));

    return () => {
      live = false;
    };
    // `key` already encodes everything that should re-trigger a snapshot,
    // including the theme. `mapStyle` is excluded deliberately — it is one of
    // two module constants, so depending on it would be harmless but redundant,
    // and `point`/`size` are objects that would re-fire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = key && result?.key === key ? result : null;
  return { uri: current?.uri ?? null, failed: current !== null && current.uri === null };
}
