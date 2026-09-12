/**
 * The update manifest, and the politeness around fetching it.
 *
 * ## Why not the GitHub API
 *
 * `api.github.com` is **60 requests per hour per IP** unauthenticated. A campus
 * shares one public IP, so a few hundred students on any sane check interval
 * would spend most of the day rate-limited — and a 403 there is
 * indistinguishable from "no update" without special handling. Authenticating
 * is not an option either: `EXPO_PUBLIC_*` is inlined into the APK and readable
 * by anyone who unzips it, so shipping a token would be publishing it.
 *
 * `releases/latest/download/<asset>` is a stable redirect on **github.com**,
 * which is not rate-limited that way. `release.yml` publishes `latest.json`
 * there beside the APK.
 */
export const MANIFEST_URL =
  'https://github.com/yjaphzs/flushy-flash/releases/latest/download/latest.json';

export type UpdateManifest = {
  schema: number;
  version: string;
  versionCode: number;
  notes: string | null;
  apk: { url: string; bytes: number; sha256: string | null };
  minSdk: number;
  abi: string;
  /** Reserved for expo-updates. Null until OTA ships. */
  ota: unknown;
};

/** Success is cheap to re-check; there is no hurry. */
const TTL_MS = 6 * 60 * 60 * 1000;
/** Failure backs off: 15m, 1h, 6h, then holds at 24h. */
const BACKOFF_MS = [15 * 60_000, 60 * 60_000, 6 * 60 * 60_000, 24 * 60 * 60_000];
/** The platform imposes no timeout of its own, so we impose one — as `lib/location.ts` does. */
const TIMEOUT_MS = 8000;

type CacheState = {
  checkedAt: number;
  etag: string | null;
  failures: number;
  manifest: UpdateManifest | null;
};

const EMPTY: CacheState = { checkedAt: 0, etag: null, failures: 0, manifest: null };

/**
 * In-memory only, deliberately.
 *
 * Persisting across launches would need a storage dependency for something
 * whose entire purpose is to avoid a handful of requests per session. A cold
 * start costs exactly one request; the TTL stops the other N.
 */
let cache: CacheState = EMPTY;

/** Test seam. */
export function resetManifestCache(): void {
  cache = EMPTY;
}

function dueAt(state: CacheState): number {
  if (state.failures === 0) return state.checkedAt + TTL_MS;
  return state.checkedAt + BACKOFF_MS[Math.min(state.failures - 1, BACKOFF_MS.length - 1)];
}

/**
 * Fetches the manifest, honouring the TTL and the failure backoff.
 *
 * `force` is the manual "Check for updates" button, which bypasses both — a
 * person who just tapped a button is owed a real answer, including a failure.
 *
 * Returns null for "no usable manifest", never throws. A malformed document is
 * treated as no update rather than as an error: a broken release should not
 * produce an error dialog on every launch.
 */
export async function fetchManifest(force = false): Promise<UpdateManifest | null> {
  const now = Date.now();
  if (!force && now < dueAt(cache)) return cache.manifest;

  try {
    const res = await fetch(MANIFEST_URL, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'Cache-Control': 'no-cache',
        ...(cache.etag ? { 'If-None-Match': cache.etag } : {}),
      },
    });

    // Unchanged since last time: refresh the clock, keep what we have.
    if (res.status === 304) {
      cache = { ...cache, checkedAt: now, failures: 0 };
      return cache.manifest;
    }
    if (!res.ok) throw new Error(`manifest ${res.status}`);

    const manifest = parseManifest(await res.json());
    cache = { checkedAt: now, etag: res.headers.get('etag'), failures: 0, manifest };
    return manifest;
  } catch {
    // Keep the last good manifest: a flaky network should not retract an
    // update that is genuinely available.
    cache = { ...cache, checkedAt: now, failures: cache.failures + 1 };
    return cache.manifest;
  }
}

/**
 * Validates the shape rather than casting it.
 *
 * This document is fetched over the network and drives a download the user is
 * then asked to install, so "it parsed as JSON" is not enough. Anything missing
 * or the wrong type means no update.
 */
function parseManifest(raw: unknown): UpdateManifest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const m = raw as Record<string, unknown>;
  const apk = m.apk as Record<string, unknown> | undefined;

  if (typeof m.version !== 'string' || !m.version) return null;
  if (!apk || typeof apk.url !== 'string' || typeof apk.bytes !== 'number') return null;
  // Only ever our own release bucket. A manifest that has been tampered with
  // must not be able to point the installer at an arbitrary host.
  if (!apk.url.startsWith('https://github.com/yjaphzs/flushy-flash/releases/download/')) {
    return null;
  }

  return {
    schema: typeof m.schema === 'number' ? m.schema : 1,
    version: m.version,
    versionCode: typeof m.versionCode === 'number' ? m.versionCode : 0,
    notes: typeof m.notes === 'string' ? m.notes : null,
    apk: {
      url: apk.url,
      bytes: apk.bytes,
      sha256: typeof apk.sha256 === 'string' ? apk.sha256 : null,
    },
    minSdk: typeof m.minSdk === 'number' ? m.minSdk : 0,
    abi: typeof m.abi === 'string' ? m.abi : '',
    ota: m.ota ?? null,
  };
}
