import { useCallback } from 'react';

import { pickNearestOpen } from '@/features/restrooms/nearest';
import { formatDistance } from '@/lib/geo';
import { getCurrentFix } from '@/lib/location';
import { useCampusStore } from '@/stores/campus-store';
import { useMapFocusStore } from '@/stores/map-focus-store';

/**
 * The centre action's behaviour, kept out of the tab bar so the bar renders on
 * navigation state alone and never re-renders when campus data changes.
 *
 * Stores are read through getState() rather than hooks for the same reason.
 *
 * No auth check anywhere in this path: the app is guest-first and finding a
 * toilet is a read.
 */
export function useFindNearest() {
  return useCallback(async () => {
    const { begin, succeed, fail, outcome } = useMapFocusStore.getState();
    const { buildings, restrooms, loading } = useCampusStore.getState();

    // Debounce. Without this a second tap starts a CONCURRENT getCurrentFix(),
    // which the dialog makes obvious: the first result closes it while the
    // second is still running, then reopens it.
    if (outcome === 'locating') return;

    // Checked BEFORE begin(), so a search that cannot succeed never triggers a
    // location permission prompt — and so this press never enters `locating`,
    // which is what keeps the searching dialog from flashing for it.
    if (loading) {
      fail(useMapFocusStore.getState().attempt, 'campusLoading');
      return;
    }

    // Every write below is tagged with this, so a cancelled search cannot
    // resurrect itself when its fix finally lands.
    const attempt = begin();

    const fix = await getCurrentFix();
    if (fix.kind !== 'ok') {
      fail(attempt, fix.kind);
      return;
    }

    const nearest = pickNearestOpen(restrooms, fix.point);
    if (!nearest) {
      fail(attempt, 'none');
      return;
    }

    // The label prefers the landmark the submitter wrote, falling back to the
    // building name. A pin with neither is still a valid restroom, so the
    // distance alone has to read sensibly.
    const building = buildings.find((b) => b.id === nearest.restroom.buildingId);
    const name = nearest.restroom.landmark || building?.name;
    succeed(
      attempt,
      {
        lat: nearest.restroom.location.latitude,
        lng: nearest.restroom.location.longitude,
      },
      name ? `${name} · ${formatDistance(nearest.distanceM)}` : formatDistance(nearest.distanceM),
    );
  }, []);
}
