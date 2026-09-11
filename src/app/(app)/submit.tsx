import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ScreenScrollView } from '@/components/screen';
import { Text } from '@/components/text';
import { View } from '@/components/view';
import { TextField, TextFieldDescription, TextFieldError, TextFieldInput, TextFieldLabel } from '@/components/text-field';
import { EMPTY_AMENITIES, createRestroom } from '@/features/restrooms/api';
import { useUid } from '@/stores/auth-store';
import { useBuildings } from '@/stores/campus-store';
import type { Amenities } from '@/lib/types';

const TOGGLES: { key: keyof Omit<Amenities, 'genderedAs'>; label: string }[] = [
  { key: 'isFree', label: 'Free' },
  { key: 'hasWater', label: 'Has water' },
  { key: 'hasTissue', label: 'Has tissue' },
  { key: 'hasBidet', label: 'Has bidet' },
  { key: 'accessible', label: 'Accessible' },
  { key: 'babyChanging', label: 'Baby changing' },
];

export default function SubmitRestroomScreen() {
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();
  const buildings = useBuildings();
  const uid = useUid();

  const [floor, setFloor] = useState('1');
  const [locationNote, setLocationNote] = useState('');
  const [amenities, setAmenities] = useState<Amenities>(EMPTY_AMENITIES);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const building = buildings.find((b) => b.id === buildingId);

  function toggle(key: keyof Omit<Amenities, 'genderedAs'>) {
    setAmenities((prev) => ({ ...prev, [key]: prev[key] === true ? null : true }));
  }

  async function onSubmit() {
    if (!uid || !buildingId) return;
    const parsedFloor = Number.parseInt(floor, 10);
    if (!Number.isFinite(parsedFloor)) {
      setError('Floor must be a number.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await createRestroom({
        buildingId,
        floor: parsedFloor,
        locationNote,
        amenities,
        createdBy: uid,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this restroom.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenScrollView contentContainerClassName="px-5 py-5 gap-5">
      <Text className="text-muted-foreground">
        Adding to {building?.name ?? 'this building'}.
      </Text>

      <TextField>
        <TextFieldLabel>Floor</TextFieldLabel>
        <TextFieldInput value={floor} onChangeText={setFloor} keyboardType="number-pad" />
        <TextFieldDescription>Ground floor is 1.</TextFieldDescription>
      </TextField>

      <TextField>
        <TextFieldLabel>Where is it?</TextFieldLabel>
        <TextFieldInput
          value={locationNote}
          onChangeText={setLocationNote}
          placeholder="Near the east stairwell"
        />
        <TextFieldDescription>
          How you would describe it to a classmate who has never been here.
        </TextFieldDescription>
        {error ? <TextFieldError>{error}</TextFieldError> : null}
      </TextField>

      <View className="gap-2">
        <Text className="text-sm font-medium">Amenities</Text>
        <View className="flex-row flex-wrap gap-2">
          {TOGGLES.map(({ key, label }) => (
            <Chip
              key={key}
              variant={amenities[key] === true ? 'primary' : 'secondary'}
              onPress={() => toggle(key)}
            >
              <Chip.Label>{label}</Chip.Label>
            </Chip>
          ))}
        </View>
      </View>

      <Button onPress={onSubmit} isDisabled={busy || !buildingId || !locationNote}>
        <Button.Label>{busy ? 'Saving…' : 'Save restroom'}</Button.Label>
      </Button>
    </ScreenScrollView>
  );
}
