import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/feedback/callout';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import {
  useBuildings,
  useCampusError,
  useCampusLoading,
  useCampusStore,
  useRestrooms,
} from '@/stores/campus-store';
import { useMapFocusStore, useNearestLabel, useNearestOutcome } from '@/stores/map-focus-store';

/**
 * The map's two status banners, moved out of index.tsx — which was the file
 * that kept growing against the 200-line cap.
 *
 * Both render over map tiles rather than over `bg-background`, which is what
 * `opaqueOverMap` is for: Callout's tones are `bg-*-soft`, tuned for a form, and
 * they read as a smear on top of roads and buildings. The class is applied HERE
 * rather than in Callout because that component has nine call sites and five of
 * the six files are auth forms that must not change.
 */
const OVER_MAP = 'bg-background shadow-md';

/**
 * Three genuinely different states that all used to look like an empty map.
 *
 * Deliberately NOT auto-dismissed, unlike the nearest-search banners below.
 * These describe what the map IS — still loading, failed to load, empty — rather
 * than reporting an event that has finished. "No restrooms yet" stops being true
 * the moment someone adds one, and it should disappear then, not on a timer.
 */
export function CampusStatus() {
  const loading = useCampusLoading();
  const error = useCampusError();
  const buildings = useBuildings();
  const restrooms = useRestrooms();

  if (loading) {
    return (
      <Callout tone="info" className={OVER_MAP}>
        <View className="flex-row items-center gap-2">
          <Spinner size="sm" />
          <Text type="body-sm" color="muted">
            Loading campus…
          </Text>
        </View>
      </Callout>
    );
  }

  if (error) {
    return (
      <Callout tone="danger" className={OVER_MAP}>
        <View className="gap-2">
          <Text type="body-sm">{error}</Text>
          <Button size="sm" variant="secondary" onPress={() => useCampusStore.getState().retry()}>
            <Button.Label>Try again</Button.Label>
          </Button>
        </View>
      </Callout>
    );
  }

  if (buildings.length === 0) {
    return (
      <Callout tone="info" className={OVER_MAP}>
        <Text type="body-sm">No buildings loaded yet.</Text>
      </Callout>
    );
  }

  if (restrooms.length === 0) {
    return (
      <Callout tone="info" className={OVER_MAP}>
        <Text type="body-sm">No restrooms yet. Add the first one with the + button.</Text>
      </Callout>
    );
  }

  return null;
}

/** Feedback for the tab bar's centre action. One message, never a silent no-op. */
const NEAREST_COPY: Record<string, string> = {
  denied: 'Location is off. Turn it on to find the nearest restroom.',
  unavailable: "Couldn't get a location fix. Try again outdoors.",
  none: 'No open restrooms listed yet.',
  campusLoading: 'Still loading the campus…',
};

/** Long enough to read; short enough not to become furniture. */
const DISMISS_MS = 5000;
/** The flyTo is 900ms — let it land before the label goes. */
const FOUND_MS = 2600;

export function NearestStatus() {
  const outcome = useNearestOutcome();
  const label = useNearestLabel();

  /**
   * Settled messages clear themselves.
   *
   * `dismiss()` existed in the store from the start and was never called by
   * anything, so every outcome banner stayed on screen until the app restarted
   * — two stale alerts stacked on top of each other was the visible symptom.
   * An event that finished should not be indistinguishable from the current
   * state of the world.
   *
   * `locating` is excluded: it ends when the search does, and a timer would
   * race the dialog.
   */
  useEffect(() => {
    if (outcome === 'idle' || outcome === 'locating') return;
    const id = setTimeout(
      () => useMapFocusStore.getState().dismiss(),
      outcome === 'found' ? FOUND_MS : DISMISS_MS,
    );
    return () => clearTimeout(id);
  }, [outcome]);

  if (outcome === 'found' && label) {
    return (
      <Callout tone="success" className={OVER_MAP} testID="nearest-found">
        <Text type="body-sm">{label}</Text>
      </Callout>
    );
  }

  const copy = NEAREST_COPY[outcome];
  if (!copy) return null;

  return (
    <Callout tone="danger" className={OVER_MAP} testID="nearest-status">
      <Text type="body-sm">{copy}</Text>
    </Callout>
  );
}
