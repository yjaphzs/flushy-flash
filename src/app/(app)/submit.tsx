import { useEffect, useState } from 'react';
import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { PinField } from '@/features/restrooms/components/pin-field';
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
import {
  usePinDraftNonce,
  usePinDraftPoint,
  usePinDraftStore,
} from '@/stores/pin-draft-store';
import { snapBuilding } from '@/features/restrooms/snap-building';
import { usePendingQuota } from '@/features/restrooms/pending-quota';
import type { LatLng } from '@/lib/campus';
import type { Amenities, GenderedAs } from '@/lib/types';

const TOGGLES: { key: keyof Omit<Amenities, 'genderedAs'>; label: string }[] = [
  { key: 'isFree', label: 'Free' },
  { key: 'hasWater', label: 'Has water' },
  { key: 'hasTissue', label: 'Has tissue' },
  { key: 'hasBidet', label: 'Has bidet' },
  { key: 'accessible', label: 'Accessible' },
];

/** Who may use it. Was in the type from the start and never had a control. */
const ACCESS: { value: GenderedAs; label: string }[] = [
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
  { value: 'unisex', label: 'Anyone' },
  { value: 'accessible_only', label: 'Accessible only' },
];

export default function SubmitRestroomScreen() {
  const buildings = useBuildings();
  const uid = useUid();
  const canWrite = useCanWrite();
  const requestWrite = useRequestWrite();
  const form = useSubmitRestroom();

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
   * The pin comes back from the full-screen placer through a store, and is read
   * HERE, during render.
   *
   * Adjusting state in the render body rather than an effect is deliberate:
   * React re-runs this render immediately and never paints the in-between,
   * whereas an effect would show one frame carrying the stale pin. AGENTS.md §8
   * bans useEffect + router.push, and this is the shape that needs neither.
   *
   * Both counters start at 0, so nothing fires on first mount, and backing out
   * of the placer never moves the nonce.
   */
  const draftPoint = usePinDraftPoint();
  const draftNonce = usePinDraftNonce();
  const [seenNonce, setSeenNonce] = useState(0);
  const [point, setPoint] = useState<LatLng | null>(null);

  if (draftNonce !== seenNonce) {
    setSeenNonce(draftNonce);
    setPoint(draftPoint);
  }

  // Cleanup, not navigation — a later composer must not inherit this pin.
  useEffect(() => () => usePinDraftStore.getState().reset(), []);

  const nearestBuilding = snapBuilding(point, buildings);

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

  /**
   * The contribution cap, surfaced rather than discovered.
   *
   * `firestore.rules` refuses the create at three pending restrooms, so
   * without this the user fills in a whole form, presses Save, and gets a
   * permission error naming nothing they could have known in advance.
   */
  const quota = usePendingQuota(uid);

  const ready =
    Boolean(point) && landmark.trim().length > 0 && !form.busy && !quota.full;

  return (
    <FormScreen
      title="Add a restroom"
      subtitle="Drop a pin where it is, then tell people how to find it."
      onBack={() => router.back()}
      avoidsKeyboard
    >
      {/*
        Only once it matters. A quota line above an empty form on someone’s
        first contribution is a rule looking for a rule-breaker; at two of
        three it is genuinely useful information.
      */}
      {canWrite && quota.used > 0 ? (
        <Text type="body-sm" color={quota.full ? undefined : 'muted'}
          className={quota.full ? 'text-danger' : undefined}>
          {quota.full
            ? `You have ${quota.cap} restrooms waiting to be confirmed. Once students confirm one, you can add another.`
            : `${quota.used} of ${quota.cap} pending. Verified restrooms do not count.`}
        </Text>
      ) : null}

      <PinField point={point} building={nearestBuilding} />

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
