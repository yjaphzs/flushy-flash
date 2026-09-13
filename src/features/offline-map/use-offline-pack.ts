import { useCallback, useEffect, useState } from 'react';

import {
  deleteCampusPack,
  downloadCampusPack,
  getCampusPack,
} from '@/components/common/offline-map';

/**
 * `unknown` only until the first read of the offline database resolves —
 * everything renders from it, so there is no separate `loading` flag.
 */
export type OfflinePackPhase = 'unknown' | 'absent' | 'downloading' | 'present';

export type OfflinePackState = {
  phase: OfflinePackPhase;
  /** 0-100 while downloading. */
  percent: number;
  /** Bytes actually stored, from MapLibre — never an estimate we made up. */
  bytes: number;
  error: string | null;
  download: () => void;
  remove: () => void;
};

/**
 * The campus tile pack, as something a Settings row can render.
 *
 * ⚠️ **The size is reported, never predicted.** The plan for this feature
 * carried a "~25 MB" estimate; measuring OpenFreeMap's endpoints put the real
 * tile cost under a megabyte and the font cost — which is why the pack has no
 * fonts — at forty to fifty. A number in a button is a promise, so this one
 * comes from `OfflinePackStatus.completedResourceSize` and is shown after the
 * fact rather than before it.
 */
export function useOfflinePack(): OfflinePackState {
  const [phase, setPhase] = useState<OfflinePackPhase>('unknown');
  const [percent, setPercent] = useState(0);
  const [bytes, setBytes] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void getCampusPack()
      .then(async (pack) => {
        if (!live) return;
        if (!pack) {
          setPhase('absent');
          return;
        }
        // A pack whose download was interrupted is still a pack. Its own status
        // is the only thing that knows which.
        const status = await pack.status();
        if (!live) return;
        setBytes(status.completedResourceSize);
        setPercent(status.percentage);
        setPhase(status.state === 'complete' ? 'present' : 'absent');
      })
      .catch(() => live && setPhase('absent'));
    return () => {
      live = false;
    };
  }, []);

  const download = useCallback(() => {
    setError(null);
    setPercent(0);
    setPhase('downloading');
    void downloadCampusPack(
      (status) => {
        setPercent(status.percentage);
        setBytes(status.completedResourceSize);
        if (status.state === 'complete') setPhase('present');
      },
      (message) => {
        setError(message);
        setPhase('absent');
      },
    ).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'Could not download the map.');
      setPhase('absent');
    });
  }, []);

  const remove = useCallback(() => {
    setError(null);
    void deleteCampusPack()
      .then(() => {
        setBytes(0);
        setPercent(0);
        setPhase('absent');
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Could not remove the map.');
      });
  }, []);

  return { phase, percent, bytes, error, download, remove };
}
