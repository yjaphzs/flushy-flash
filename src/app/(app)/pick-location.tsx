import { useCallback, useRef, useState } from 'react';
import { router } from 'expo-router';

import {
  ATTRIBUTION_LEFT,
  CAMPUS_MAX_BOUNDS,
  Map,
  MapCamera,
  MapUserLocation,
  ORNAMENT_LEFT,
  type MapCameraRef,
  type ViewStateChangeEvent,
  campusCameraProps,
  toLngLat,
  useMapStyle,
} from '@/components/common/map';
import { CentrePin } from '@/components/common/centre-pin';
import { BackButton } from '@/components/layouts/back-button';
import { Screen } from '@/components/layouts/screen';
import { useBottomInset, useTopInset } from '@/components/layouts/tab-bar-metrics';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { snapBuilding } from '@/features/restrooms/snap-building';
import { useBuildings } from '@/stores/campus-store';
import { usePinDraftStore } from '@/stores/pin-draft-store';
import { CAMPUS_CENTER, PLACER_ZOOM, type LatLng } from '@/lib/campus';
import { isOnCampus } from '@/lib/geo';
import { getCurrentFix, lastKnownPoint } from '@/lib/location';

/** Height of the crosshair glyph. */
const PIN = 48;

/**
 * Place the pin, full screen.
 *
 * Replaces a 280pt map embedded in the submit form's ScrollView — where the
 * map's pan gesture competed with the parent scroll and there was almost no
 * room to aim. This is the whole screen, so neither problem exists.
 *
 * ⚠️ `/submit` stays mounted underneath (this is `fullScreenModal`, a sibling
 * route, not a replacement). That is load-bearing: the form holds picked photos
 * as LOCAL FILE URIs, and unmounting it would make the user re-pick every one.
 * The chosen point comes back through `pin-draft-store`, not a route param.
 */
export default function PickLocationScreen() {
  const buildings = useBuildings();
  const mapStyle = useMapStyle();
  const camera = useRef<MapCameraRef>(null);
  const topInset = useTopInset();
  const bottomInset = useBottomInset();

  /**
   * Where the camera opens. Computed once — `initialViewState` is initial-only
   * and MapLibre ignores later changes.
   *
   * `lastKnownPoint()` never prompts; it returns the fix this session already
   * has. That is why opening the composer no longer fires a permission dialog
   * the way the old inline picker's mount-time `getCurrentFix()` did — the
   * prompt moved to the explicit locate button below.
   */
  const [seed] = useState<LatLng>(() => {
    const draft = usePinDraftStore.getState().point;
    if (draft) return draft;
    const known = lastKnownPoint();
    return known && isOnCampus(known) ? known : CAMPUS_CENTER;
  });

  const [point, setPoint] = useState<LatLng>(seed);
  const [footerHeight, setFooterHeight] = useState(180);

  const building = snapBuilding(point, buildings);
  const valid = isOnCampus(point);

  const onRegionDidChange = useCallback((e: { nativeEvent: ViewStateChangeEvent }) => {
    const [lng, lat] = e.nativeEvent.center;
    setPoint({ lat, lng });
  }, []);

  const locate = useCallback(async () => {
    const fix = await getCurrentFix();
    if (fix.kind !== 'ok' || !isOnCampus(fix.point)) return;
    camera.current?.flyTo({ center: toLngLat(fix.point), zoom: PLACER_ZOOM, duration: 600 });
  }, []);

  function confirm() {
    usePinDraftStore.getState().commit(point);
    // The placer dismisses ITSELF. AGENTS.md §8 bans useEffect + router.push,
    // and /submit reads the store during render rather than navigating.
    router.back();
  }

  return (
    <Screen topInset={false}>
      <Map
        style={{ flex: 1 }}
        mapStyle={mapStyle}
        /*
          A full-screen map is no longer "a control", so the inline picker's
          reasoning for hiding these does not survive. OSM attribution is a
          LICENCE condition — lifted above the footer so it stays legible.
        */
        attribution
        logo
        compass={false}
        logoPosition={{ bottom: footerHeight + 8, left: ORNAMENT_LEFT }}
        attributionPosition={{ bottom: footerHeight + 8, left: ATTRIBUTION_LEFT }}
        /*
          The footer covers the bottom of the screen, so the VISUAL centre is
          not the screen centre. This shifts the logical viewport to match,
          which is what makes onRegionDidChange report the point the crosshair
          is actually drawn over. Get this wrong and the saved coordinate is
          not where the user aimed — with no error.
        */
        contentInset={{ bottom: footerHeight }}
        // A rotated map makes a fixed crosshair meaningless, and retires the
        // compass question along with it.
        touchRotate={false}
        touchPitch={false}
        onRegionDidChange={onRegionDidChange}
      >
        <MapCamera
          ref={camera}
          {...campusCameraProps}
          initialViewState={{ center: toLngLat(seed), zoom: PLACER_ZOOM }}
          maxBounds={CAMPUS_MAX_BOUNDS}
        />
        <MapUserLocation />
      </Map>

      {/*
        The crosshair, in screen space. `pointerEvents="none"` lets the pan pass
        straight through — without it the control swallows every drag that
        starts on the pin, which is most of them. Its box stops at the footer so
        it stays centred on the same point `contentInset` reports.
      */}
      <View
        className="absolute left-0 right-0 top-0 items-center justify-center"
        style={{ bottom: footerHeight }}
        pointerEvents="none"
      >
        <CentrePin size={PIN} color={valid ? 'accent' : 'danger'} />
      </View>

      {/*
        Opaque-ish: a bare chevron over arbitrary map tiles is unreadable.

        `edgeAligned={false}` because there is no content edge here — the
        component's -ml-3 would drag the glyph off centre and squash the disc
        into an ellipse. The box is sized explicitly to 48 so it matches the
        locate button below rather than being 4pt smaller than its neighbour.
      */}
      <View className="absolute left-4" style={{ top: topInset + 12 }}>
        <View className="h-12 w-12 items-center justify-center rounded-full bg-background/95 shadow-md">
          <BackButton onPress={() => router.back()} color="foreground" edgeAligned={false} />
        </View>
      </View>

      <Pressable
        onPress={() => void locate()}
        accessibilityRole="button"
        accessibilityLabel="Centre on my location"
        className="absolute right-4 h-12 w-12 items-center justify-center rounded-full bg-background/95 shadow-md"
        style={{ bottom: footerHeight + 16 }}
      >
        <Icon name="locate-fixed" size={22} color="foreground" />
      </Pressable>

      {/*
        Opaque, not GlassSurface. Its docblock says to use it where something
        interesting sits behind — and the map does — but map-status.tsx already
        established the counter-precedent: heroui's translucent tones read as a
        smear over roads and buildings, and contrast over arbitrary tiles cannot
        be verified. A footer carrying the primary CTA needs contrast that can.
      */}
      <View
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
        className="absolute bottom-0 left-0 right-0 gap-3 rounded-t-3xl border-t border-border bg-background px-5 pt-4 shadow-md"
        style={{ paddingBottom: bottomInset + 16, borderCurve: 'continuous' }}
      >
        <View className="gap-1">
          <Text type="body" weight="semibold" className={valid ? undefined : 'text-danger'}>
            {!valid
              ? 'That spot is outside campus.'
              : building
                ? `Looks like ${building.name}.`
                : 'Not near a mapped building.'}
          </Text>
          <Text type="body-xs" color="muted">
            Drag the map to put the pin on the entrance.
          </Text>
        </View>

        <Button size="lg" className="rounded-full" isDisabled={!valid} onPress={confirm}>
          <Button.Label>Use this spot</Button.Label>
        </Button>
      </View>
    </Screen>
  );
}
