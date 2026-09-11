import { useMemo } from 'react';
import { router } from 'expo-router';

import {
  CAMPUS_MAX_BOUNDS,
  Map,
  MapCamera,
  MapMarker,
  MapUserLocation,
  MAP_STYLE,
  campusCameraProps,
  toLngLat,
} from '@/components/map';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { View } from '@/components/view';
import { useCampusData } from '@/hooks/use-campus-data';
import { useBuildings, useCampusError, useRestrooms } from '@/stores/campus-store';

export default function MapScreen() {
  useCampusData();

  const buildings = useBuildings();
  const restrooms = useRestrooms();
  const error = useCampusError();

  // Buildings are the map's unit, not individual restrooms: a pin per restroom
  // would stack several on one rooftop with no way to tell floors apart.
  // NB: a plain record, not a `new Map()` — MapLibre's `Map` component shadows
  // the global Map constructor in this file.
  const counts = useMemo(() => {
    const byBuilding: Record<string, number> = {};
    for (const r of restrooms) {
      byBuilding[r.buildingId] = (byBuilding[r.buildingId] ?? 0) + 1;
    }
    return byBuilding;
  }, [restrooms]);

  return (
    <Screen>
      <Map style={{ flex: 1 }} mapStyle={MAP_STYLE} attribution logo compass>
        <MapCamera {...campusCameraProps} maxBounds={CAMPUS_MAX_BOUNDS} />
        <MapUserLocation />

        {buildings.map((building) => (
          <MapMarker
            key={building.id}
            id={building.id}
            lngLat={toLngLat({
              lat: building.location.latitude,
              lng: building.location.longitude,
            })}
            onPress={() => router.push(`/building/${building.id}`)}
          >
            <View className="rounded-full bg-primary px-2 py-1" style={{ borderCurve: 'continuous' }}>
              <Text className="text-xs text-primary-foreground">
                {counts[building.id] ?? 0}
              </Text>
            </View>
          </MapMarker>
        ))}
      </Map>

      {error ? (
        <View className="absolute bottom-6 left-4 right-4 rounded-xl bg-destructive px-4 py-3" style={{ borderCurve: 'continuous' }}>
          <Text className="text-destructive-foreground text-sm">{error}</Text>
        </View>
      ) : null}
    </Screen>
  );
}
