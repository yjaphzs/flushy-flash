import { File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';

/**
 * Downloading an APK and handing it to Android's package installer.
 *
 * ## The legacy import is correct, not an oversight
 *
 * `getContentUriAsync` exists only on `expo-file-system/legacy` — the new API
 * deliberately throws for it. Same package, one subpath. A `file://` URI would
 * raise `FileUriExposedException` on anything targeting API 24+, and this app
 * targets 36, so a content:// URI is mandatory.
 *
 * No FileProvider config plugin is needed: expo-file-system already declares
 * `${applicationId}.FileSystemFileProvider` in its own manifest, and it is
 * present in the merged release manifest. Its `file_system_provider_paths.xml`
 * maps the files and cache roots — which is why the APK MUST be written under
 * `Paths.cache` or `Paths.document`. Anywhere else and `getContentUriAsync`
 * throws `Failed to find configured root`.
 */

const GRANT_READ_URI_PERMISSION = 1;
const NEW_TASK = 0x10000000;
const APK_MIME = 'application/vnd.android.package-archive';

const fileName = (version: string) => `flushy-flash-v${version}.apk`;

export class NotEnoughSpace extends Error {
  constructor() {
    super('Not enough free space to download the update.');
  }
}

export class TruncatedDownload extends Error {
  constructor() {
    super('The download did not complete. Please try again.');
  }
}

/**
 * Downloads the APK and opens the system installer.
 *
 * Resolves once the installer has been LAUNCHED — not once the app is
 * installed. Android hands control to the package installer and the user
 * decides there; we never learn the outcome, which is why the caller has to
 * treat "returned successfully" as "asked", not "done".
 */
export async function downloadAndInstall(
  url: string,
  version: string,
  expectedBytes: number,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  // 1.2x because the installer needs room to copy it out again during install.
  if (expectedBytes > 0 && Paths.availableDiskSpace < expectedBytes * 1.2) {
    throw new NotEnoughSpace();
  }

  const dest = new File(Paths.cache, fileName(version));

  await File.downloadFileAsync(url, dest, {
    // Resuming a half-file from a previous attempt would install corrupt bytes.
    idempotent: true,
    signal,
    onProgress: ({ bytesWritten, totalBytes }) => {
      // totalBytes is -1 when the server sends no Content-Length; fall back to
      // the size the manifest promised rather than reporting nonsense.
      const total = totalBytes > 0 ? totalBytes : expectedBytes;
      if (total > 0) onProgress(Math.min(1, bytesWritten / total));
    },
  });

  /**
   * Size, not SHA-256.
   *
   * Hashing ~70 MB in JS is slow and would need another dependency. What this
   * actually defends against is a truncated download, which size catches. A
   * *tampered* APK is caught by the OS: the installer verifies its v2 signature
   * against the installed app's certificate, so a replacement signed by anyone
   * else simply fails to install. The manifest carries a sha256 anyway, so the
   * check can be added later without a schema change.
   */
  if (expectedBytes > 0 && dest.size !== expectedBytes) {
    dest.delete();
    throw new TruncatedDownload();
  }

  const contentUri = await getContentUriAsync(dest.uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: APK_MIME,
    flags: GRANT_READ_URI_PERMISSION | NEW_TASK,
  });
}

/**
 * Opens the "install unknown apps" settings page for this app.
 *
 * We cannot query `canRequestPackageInstalls()` without native code, and do not
 * need to: since API 26 the installer shows its own prompt and deep-links
 * there. This is the manual escape hatch for when that prompt is dismissed, or
 * when a Samsung device blocks the install outright via Auto Blocker.
 */
export async function openInstallPermissionSettings(): Promise<void> {
  await IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES', {
    data: `package:${Application.applicationId}`,
  });
}

/**
 * Deletes downloaded APKs left in the cache.
 *
 * ~70 MB of a student's storage per update, and the cache is not cleared for us
 * on a successful install — the app is replaced while the old cache directory
 * survives. Safe to call at any time: a file being installed has already been
 * copied out by the installer.
 */
export function clearDownloadedApks(): void {
  try {
    for (const entry of Paths.cache.list()) {
      if (entry instanceof File && /^flushy-flash-v.*\.apk$/.test(entry.name)) entry.delete();
    }
  } catch {
    // Housekeeping only — never let it break a launch.
  }
}
