import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { CentrePin } from '@/components/common/centre-pin';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useStaticMap } from '@/features/restrooms/use-static-map';
import { useBuildings } from '@/stores/campus-store';
import type { LatLng } from '@/lib/campus';
import type { Building } from '@/lib/types';

const PREVIEW_H = 128;

export type PinFieldProps = {
  point: LatLng | null;
  building: Building | null;
};

/**
 * "Where is it?" — a button before a pin exists, a preview after.
 *
 * Both open the same full-screen placer. The form used to embed a 280pt live
 * map here, which put a pan gesture inside a ScrollView and gave the user
 * almost no room to aim.
 */
export function PinField({ point, building }: PinFieldProps) {
  const open = () => router.push('/pick-location');

  if (!point) {
    return (
      <View className="gap-2">
        <Text type="h4">Where is it?</Text>
        {/*
          `sm`, matching the "Choose photos" button directly below it — the two
          differed by nothing but this prop, which made the map button 56pt
          against its 40pt and read as the more important of the two.

          heroui's Button has no StartContent part; the compound is only Label
          and Background. Ordering plain children IS the supported pattern —
          the root is already flex-row items-center with a per-size gap (6pt
          at `sm`) — and the wrapper types children as
          `Exclude<ReactNode, string | number>`, so only a BARE string is
          rejected and an element array passes through untouched.
        */}
        <Button variant="secondary" size="sm" className="rounded-full" onPress={open}>
          <Icon name="map" size={16} color="accent-soft-foreground" />
          <Button.Label>Choose on the map</Button.Label>
        </Button>
        <Text type="body-xs" color="muted">
          Drop a pin on the entrance so the next person can find it.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <Text type="h4">Where is it?</Text>
      <PinPreview point={point} building={building} onPress={open} />
    </View>
  );
}

/**
 * A rendered PNG of the spot, not a second live map.
 *
 * Every `<Map>` is a real GL surface — a second GL context, a second style
 * parse, a second tile session, and a surface Android composites on every
 * scroll frame of the form. The release build targets `armeabi-v7a` budget
 * devices deliberately; this is exactly the cost worth not paying.
 *
 * The pin is drawn in RN on top rather than baked in: it stays sharp, and the
 * snapshotter could not draw ours anyway. It goes through `CentrePin` so its
 * tip marks the same point the placer's crosshair did — centring the glyph BOX
 * puts it a few metres south, which reads as the coordinate having moved.
 *
 * ⚠️ **The snapshot carries its own attribution and this component must not add
 * a second one.** MapLibre bakes “© OpenFreeMap / OpenMapTiles / OpenStreetMap”
 * into the bottom-right of the PNG — verified on device. It is small, which is
 * why a duplicate line briefly lived here; two attributions stacked read as a
 * bug, and the full-size ornament is one tap away in the placer.
 */
function PinPreview({
  point,
  building,
  onPress,
}: PinFieldProps & { onPress: () => void }) {
  const { uri } = useStaticMap(point, { width: 340, height: PREVIEW_H });
  /*
    ⚠️ **"Not near a mapped building" is a claim about the PIN, and with no
    buildings loaded it is a claim about the wrong thing.** `snapBuilding`
    returns null for every point on campus when the collection is empty — a
    cold cache, no signal, or a failed read — so this told the user their pin
    was in a field, for every pin, including one dropped on the library steps.
    `pick-location.tsx` carried the identical line and was fixed; this copy was
    missed, which is exactly how two surfaces showing one fact drift apart.
  */
  const buildings = useBuildings();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Change the location"
      className="gap-2"
    >
      <View
        className="items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-secondary"
        style={{ height: PREVIEW_H, borderCurve: 'continuous' }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: '100%', height: PREVIEW_H }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : null}

        {/*
          Shown while the snapshot is pending AND if it fails. Never a spinner:
          the native error path does not settle its promise, so `failed` only
          arrives via our own timeout — a spinner here could run forever.
        */}
        <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
          <CentrePin size={32} color={uri ? 'accent' : 'muted'} />
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text type="body-sm" color="muted" className="flex-1">
          {building
            ? `Looks like ${building.name}.`
            : buildings.length === 0
              ? 'Building names are unavailable right now.'
              : 'Not near a mapped building.'}
        </Text>
        <View className="flex-row items-center gap-1">
          <Text type="body-sm" weight="medium">
            Change
          </Text>
          <Icon name="chevron-right" size={16} color="muted" />
        </View>
      </View>
    </Pressable>
  );
}
