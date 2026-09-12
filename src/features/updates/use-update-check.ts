import { useCallback, useEffect, useRef } from 'react';

import { checkForUpdate } from '@/features/updates/api';
import { clearDownloadedApks, downloadAndInstall } from '@/features/updates/install';
import { useAppForeground } from '@/hooks/use-app-foreground';
import { mayPromptNow, useUpdateStore } from '@/stores/update-store';

/**
 * Drives the update check, and owns when the user is allowed to be interrupted.
 *
 * Mounted once, in `(app)/_layout.tsx`, beside `useCampusData()` — that subtree
 * is permanently mounted, so this never re-runs on navigation.
 *
 * ## The prompt policy, which is most of the point
 *
 * - **On foreground return only**, never mid-cold-start. A dialog that lands
 *   while someone is still finding their bearings is an ambush.
 * - **At most once per session**, and a "Not now" holds it for 24h. Nothing in
 *   this app is gated on updating, so the prompt has no right to be insistent.
 * - **Never auto-download.** ~70 MB is a real cost on mobile data; the size is
 *   shown and the user decides.
 * - **A failed check is never surfaced.** A failed update check is not an
 *   event. The manual button is the one exception — a person who just tapped
 *   something is owed an answer, including a bad one.
 */
export function useUpdateCheck() {
  const store = useUpdateStore;

  // Stale APKs from previous updates are ~70 MB each and survive the install
  // that consumed them, because the app is replaced while its cache is not.
  useEffect(() => clearDownloadedApks(), []);

  const run = useCallback(
    async (manual: boolean) => {
      const s = store.getState();
      if (s.phase === 'checking' || s.phase === 'downloading') return;
      if (!manual && !mayPromptNow()) return;

      s.begin(manual);
      const result = await checkForUpdate(manual);

      if (result.status === 'available') {
        // Re-checked because the user may have dismissed something while the
        // request was in flight.
        if (manual || mayPromptNow()) store.getState().offerUpdate(result.offer);
        else store.getState().noUpdate();
        return;
      }
      if (result.status === 'failed' && manual) {
        store.getState().fail('Could not check for updates. Please try again.');
        return;
      }
      if (result.status === 'unsupported' && manual) {
        store.getState().fail(result.reason);
        return;
      }
      store.getState().noUpdate();
    },
    [store],
  );

  useAppForeground(() => void run(false));

  return { check: () => void run(true) };
}

/**
 * The download, kept apart from the check so the dialog can own it.
 *
 * The abort controller is disposed of on unmount, which matters: a download can
 * outlive the dialog, and `File.downloadFileAsync` is one of the few things in
 * this app that genuinely accepts an abort signal.
 */
export function useUpdateDownload() {
  const abort = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abort.current?.abort();
    },
    [],
  );

  const start = useCallback(async () => {
    const s = useUpdateStore.getState();
    if (!s.offer || s.phase === 'downloading') return;

    abort.current = new AbortController();
    s.startDownload();

    try {
      await downloadAndInstall(
        s.offer.url,
        s.offer.version,
        s.offer.bytes,
        (fraction) => useUpdateStore.getState().setProgress(fraction),
        abort.current.signal,
      );
      // "Launched the installer", not "installed" — Android never tells us.
      useUpdateStore.getState().installing();
    } catch (e) {
      const aborted = e instanceof Error && e.name === 'AbortError';
      if (aborted) return useUpdateStore.getState().dismiss();
      useUpdateStore
        .getState()
        .fail(e instanceof Error ? e.message : 'The update could not be downloaded.');
    }
  }, []);

  const cancel = useCallback(() => {
    abort.current?.abort();
    useUpdateStore.getState().dismiss();
  }, []);

  return { start: () => void start(), cancel };
}
