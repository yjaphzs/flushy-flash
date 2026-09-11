import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

import type { LatLng } from '@/lib/campus';

/**
 * Foreground location, requested once on mount.
 *
 * Indoors on a campus GPS is unreliable and floor-blind, which is why the app
 * organises restrooms by building and floor rather than trusting coordinates.
 * This is used for "nearest building" ordering only — never to infer which
 * restroom someone is standing next to.
 */
export function useCurrentLocation() {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) setDenied(true);
        return;
      }
      const fix = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!cancelled) {
        setLocation({ lat: fix.coords.latitude, lng: fix.coords.longitude });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { location, denied };
}
