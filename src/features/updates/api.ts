import * as Application from 'expo-application';

import { fetchManifest, type UpdateManifest } from '@/features/updates/manifest';
import { isNewer } from '@/features/updates/version';
import { androidApiLevel, isAndroid } from '@/lib/platform';

/**
 * What the UI is offered.
 *
 * A tagged union with one member today, and that is the seam for expo-updates:
 * an `{ kind: 'ota' }` variant is a new branch in the dialog rather than a
 * rewrite. Both have to coexist eventually — an OTA cannot ship a native
 * change, and this app adds native modules regularly (three in this change
 * alone), so the APK path can never be retired.
 */
export type UpdateOffer = {
  kind: 'apk';
  version: string;
  bytes: number;
  url: string;
  notes: string | null;
};

export type UpdateCheck =
  | { status: 'available'; offer: UpdateOffer }
  | { status: 'current' }
  | { status: 'unsupported'; reason: string }
  | { status: 'failed' };

/**
 * The installed version, read from the real `PackageInfo`.
 *
 * `Application.nativeApplicationVersion`, NOT `Constants.expoConfig.version`.
 * `release.yml` stamps `app.json` from the git tag at build time, so the config
 * value is right in a release APK and whatever the repo happens to say in a dev
 * build. This reads the same number the Android installer itself compares, so
 * it is correct in both.
 */
export function installedVersion(): string {
  return Application.nativeApplicationVersion ?? '0.0.0';
}

/**
 * Is there a newer APK?
 *
 * Never throws. Every failure mode collapses into a status the UI can render,
 * because a failed update check is not an event worth interrupting anyone for.
 */
export async function checkForUpdate(force = false): Promise<UpdateCheck> {
  // Sideloading is Android-only, and a dev build is served by Metro — offering
  // to replace it with a release APK would be actively wrong.
  if (!isAndroid) return { status: 'unsupported', reason: 'Android only' };
  if (__DEV__) return { status: 'unsupported', reason: 'Development build' };

  const manifest = await fetchManifest(force);
  if (!manifest) return { status: 'failed' };

  return evaluate(manifest, installedVersion(), androidApiLevel);
}

/**
 * Split out from the network so the decision is testable on its own.
 *
 * The minSdk check matters: without it a phone too old to install the APK would
 * still be told to download 70 MB, and only find out at the installer.
 */
export function evaluate(
  manifest: UpdateManifest,
  installed: string,
  apiLevel: number,
): UpdateCheck {
  if (!isNewer(manifest.version, installed)) return { status: 'current' };
  if (manifest.minSdk > apiLevel) {
    return { status: 'unsupported', reason: 'This version needs a newer Android' };
  }

  return {
    status: 'available',
    offer: {
      kind: 'apk',
      version: manifest.version,
      bytes: manifest.apk.bytes,
      url: manifest.apk.url,
      notes: manifest.notes,
    },
  };
}

/** `71234567` → `"68 MB"`. Shown BEFORE the download starts, never after. */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}
