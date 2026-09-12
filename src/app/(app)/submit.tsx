import { useMemo, useState } from 'react';
import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { PinPicker } from '@/components/common/pin-picker';
import { PhotoPicker } from '@/features/restrooms/components/photo-picker';
import { FormScreen } from '@/components/layouts/form-screen';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import {
  TextField,
  TextFieldDescription,
  TextFieldError,
  TextFieldInput,
  TextFieldLabel,
} from '@/components/forms/text-field';
import { EMPTY_AMENITIES } from '@/features/restrooms/api';
import { useSubmitRestroom } from '@/features/restrooms/use-submit-restroom';
import type { ComposerPhoto } from '@/features/reviews/use-review-form';
import { JoinBenefits } from '@/features/auth/components/join-benefits';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { useCanWrite, useUid } from '@/stores/auth-store';
import { useBuildings } from '@/stores/campus-store';
import { sortByDistance } from '@/lib/geo';
import type { LatLng } from '@/lib/campus';
import type { Amenities, GenderedAs } from '@/lib/types';

const TOGGLES: { key: keyof Omit<Amenities, 'genderedAs'>; label: string }[] = [
  { key: 'isFree', label: 'Free' },
  { key: 'hasWater', label: 'Has water' },
  { key: 'hasTissue', label: 'Has tissue' },
  { key: 'hasBidet', label: 'Has bidet' },
  { key: 'accessible', label: 'Accessible' },
  { key: 'babyChanging', label: 'Baby changing' },
];

/** Who may use it. Was in the type from the start and never had a control. */
const ACCESS: { value: GenderedAs; label: string }[] = [
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
  { value: 'unisex', label: 'Anyone' },
  { value: 'accessible_only', label: 'Accessible only' },
];

/** Beyond this the "nearest building" guess is noise, so offer none. */
const BUILDING_SNAP_M = 80;

export default function SubmitRestroomScreen() {
  const buildings = useBuildings();
  const uid = useUid();
  const canWrite = useCanWrite();
  const requestWrite = useRequestWrite();
  const form = useSubmitRestroom();

  const [point, setPoint] = useState<LatLng | null>(null);
  const [floor, setFloor] = useState('1');
  const [landmark, setLandmark] = useState('');
  const [locationNote, setLocationNote] = useState('');
  const [amenities, setAmenities] = useState<Amenities>(EMPTY_AMENITIES);
  const [genderedAs, setGenderedAs] = useState<GenderedAs | null>(null);
  // The union the shared picker speaks. Submit only ever holds 'new' items —
// nothing is in Storage until Save — but adopting it here is what keeps one
// picker in the app instead of a forked copy for reviews.
  const [photos, setPhotos] = useState<ComposerPhoto[]>([]);

  /**
   * The building is a LABEL derived from the pin, not something to choose from a
   * list of 95. Snapping to the nearest one within ~80 m is right far more often
   * than not, and being wrong costs nothing — buildingId is nullable now.
   */
  const nearestBuilding = useMemo(() => {
    if (!point || buildings.length === 0) return null;
    const [closest] = sortByDistance(buildings, point, (b) => ({
      lat: b.location.latitude,
      lng: b.location.longitude,
    }));
    if (!closest || closest.distanceM === null || closest.distanceM > BUILDING_SNAP_M) return null;
    return closest.item;
  }, [point, buildings]);

  async function onSubmit() {
    if (!uid) return;
    const id = await form.submit({
      point,
      buildingId: nearestBuilding?.id ?? null,
      floor,
      landmark,
      locationNote,
      amenities,
      genderedAs,
      // Submit never holds an 'existing' photo — nothing reaches Storage
      // until this call — so narrowing here is total, not a cast that hides
      // a case.
      photos: photos.flatMap((p) => (p.kind === 'new' ? [{ uri: p.uri }] : [])),
      uid,
    });
    if (id) router.back();
  }

  const ready = Boolean(point) && landmark.trim().length > 0 && !form.busy;

  return (
    <FormScreen
      title="Add a restroom"
      subtitle="Drop a pin where it is, then tell people how to find it."
      onBack={() => router.back()}
      avoidsKeyboard
    >
      <View className="gap-2">
        <Text type="h4">Where is it?</Text>
        <PinPicker onChange={setPoint} />
        <Text type="body-xs" color="muted">
          {nearestBuilding ? `Looks like ${nearestBuilding.name}.` : 'Not near a mapped building.'}
        </Text>
      </View>

      <PhotoPicker
        photos={photos}
        onChange={setPhotos}
        max={form.maxPhotos}
        pick={form.pickPhotos}
      />

      <View className="gap-2">
        <Text type="body" weight="semibold">
          Who can use it?
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {ACCESS.map(({ value, label }) => (
            <Chip
              key={value}
              variant={genderedAs === value ? 'primary' : 'secondary'}
              // Tapping the selected one clears it: "unknown" is a real answer
              // and the amenity toggles already work this way.
              onPress={() => setGenderedAs((prev) => (prev === value ? null : value))}
            >
              <Chip.Label>{label}</Chip.Label>
            </Chip>
          ))}
        </View>
      </View>

      <TextField>
        <TextFieldLabel>Landmark</TextFieldLabel>
        <TextFieldInput
          value={landmark}
          onChangeText={setLandmark}
          placeholder="CLSU Lagoon"
          maxLength={80}
        />
        <TextFieldDescription>
          The nearest thing someone who has never been here would recognise.
        </TextFieldDescription>
      </TextField>

      <TextField>
        <TextFieldLabel>How to get there</TextFieldLabel>
        <TextFieldInput
          value={locationNote}
          onChangeText={setLocationNote}
          placeholder="Behind the canteen, past the east stairwell"
          maxLength={200}
        />
        <TextFieldDescription>
          How you would describe it to a classmate on the phone.
        </TextFieldDescription>
      </TextField>

      <TextField>
        <TextFieldLabel>Floor</TextFieldLabel>
        <TextFieldInput value={floor} onChangeText={setFloor} keyboardType="number-pad" />
        <TextFieldDescription>Ground floor is 1.</TextFieldDescription>
        {form.error ? <TextFieldError>{form.error}</TextFieldError> : null}
      </TextField>

      <View className="gap-2">
        <Text type="body" weight="semibold">
          Amenities
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {TOGGLES.map(({ key, label }) => (
            <Chip
              key={key}
              variant={amenities[key] === true ? 'primary' : 'secondary'}
              onPress={() =>
                setAmenities((prev) => ({ ...prev, [key]: prev[key] === true ? null : true }))
              }
            >
              <Chip.Label>{label}</Chip.Label>
            </Chip>
          ))}
        </View>
      </View>

      {/*
        Defence in depth. The map button routes taps through the gate, but
        /submit is a deep link and a guest can arrive cold. Showing what an
        account buys beats showing a form whose submit firestore.rules refuses.
      */}
      {canWrite ? null : (
        <View className="gap-4">
          <JoinBenefits />
          <Button
            size="lg"
            className="rounded-full"
            onPress={() => requestWrite({ href: '/submit', reason: 'add' })}
          >
            <Button.Label>Create an account to add this</Button.Label>
          </Button>
        </View>
      )}

      <Button size="lg" className="rounded-full" onPress={onSubmit} isDisabled={!ready || !canWrite}>
        <Button.Label>{form.progress ?? 'Save restroom'}</Button.Label>
      </Button>
    </FormScreen>
  );
}
