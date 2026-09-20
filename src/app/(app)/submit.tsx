import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { PinField } from '@/features/restrooms/components/pin-field';
import { PhotoPicker } from '@/features/restrooms/components/photo-picker';
import { FormScreen } from '@/components/layouts/form-screen';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import {
  TextField,
  TextFieldDescription,
  TextFieldInput,
  TextFieldLabel,
} from '@/components/forms/text-field';
import { FormMessage } from '@/components/feedback/form-message';
import {
  AccessChips,
  AmenityChips,
} from '@/features/restrooms/components/amenity-chips';
import { useRestroomForm } from '@/features/restrooms/use-restroom-form';
import { useSubmitRestroom } from '@/features/restrooms/use-submit-restroom';
import { JoinBenefits } from '@/features/auth/components/join-benefits';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { useWriteBlock } from '@/hooks/use-write-block';
import { useCanWrite, useUid } from '@/stores/auth-store';
import { usePendingQuota } from '@/features/restrooms/pending-quota';

export default function SubmitRestroomScreen() {
  const uid = useUid();
  const canWrite = useCanWrite();
  const requestWrite = useRequestWrite();
  const blocked = useWriteBlock();
  const form = useSubmitRestroom();
  const fields = useRestroomForm();

  async function onSubmit() {
    if (!uid) return;
    const id = await form.submit({
      point: fields.point,
      buildingId: fields.building?.id ?? null,
      floor: fields.floor,
      landmark: fields.landmark,
      locationNote: fields.locationNote,
      amenities: fields.amenities,
      genderedAs: fields.genderedAs,
      // Submit never holds an 'existing' photo — nothing reaches Storage until
      // this call — so narrowing here is total, not a cast that hides a case.
      photos: fields.photos.flatMap((p) => (p.kind === 'new' ? [{ uri: p.uri }] : [])),
      uid,
    });
    if (id) router.back();
  }

  /**
   * The contribution cap, surfaced rather than discovered.
   *
   * `firestore.rules` refuses the create at three pending restrooms, so without
   * this the user fills in a whole form, presses Save, and gets a permission
   * error naming nothing they could have known in advance.
   */
  const quota = usePendingQuota(uid);

  /**
   * ⚠️ **At least one photo, which is new.**
   *
   * A pin with no picture is the hardest entry to trust and the hardest to
   * find: the photo IS the "is this the right door" check, and the map pin
   * renders it rather than a glyph.
   *
   * ⚠️ **Enforced here only, deliberately.** The matching `firestore.rules`
   * clause is held back a release because the two do not ship together — rules
   * deploy on merge to main, the APK on a tag — so adding it today would start
   * refusing submissions from every phone that has not updated yet, with a bare
   * permission-denied naming nothing. When it does land it must go on
   * `allow create` ONLY: on update it would make every restroom currently
   * holding `photoIds: []` permanently uneditable.
   */
  /*
    ⚠️ **What is missing, not just that something is.** `use-auth-gate`'s
    docblock states the rule the whole app follows — "the button never looks
    dead and never silently does nothing" — and a Save button greyed out at the
    bottom of a long form breaks it: the photo hint that explains it is three
    sections up, off screen. The quota case already had its own banner, so it is
    deliberately not repeated here.
  */
  const missing = !fields.point
    ? 'Drop a pin on the map first.'
    : fields.landmark.trim().length === 0
      ? 'Add a landmark so people can find it.'
      : fields.photos.length === 0
        ? 'Add at least one photo.'
        : null;

  const ready = missing === null && !form.busy && !quota.full;

  return (
    <FormScreen
      title="Add a restroom"
      subtitle="Drop a pin where it is, then tell people how to find it."
      onBack={() => router.back()}
      avoidsKeyboard
    >
      {/*
        Only once it matters. A quota line above an empty form on someone's
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

      <PinField point={fields.point} building={fields.building} />

      <PhotoPicker
        photos={fields.photos}
        onChange={fields.setPhotos}
        max={form.maxPhotos}
        pick={form.pickPhotos}
        hint="At least one, so people can tell they have found the right door."
      />

      <AccessChips value={fields.genderedAs} onChange={fields.setGenderedAs} />

      <TextField>
        <TextFieldLabel>Landmark</TextFieldLabel>
        <TextFieldInput
          value={fields.landmark}
          onChangeText={fields.setLandmark}
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
          value={fields.locationNote}
          onChangeText={fields.setLocationNote}
          placeholder="Behind the canteen, past the east stairwell"
          maxLength={200}
        />
        <TextFieldDescription>
          How you would describe it to a classmate on the phone.
        </TextFieldDescription>
      </TextField>

      <TextField>
        <TextFieldLabel>Floor</TextFieldLabel>
        <TextFieldInput
          value={fields.floor}
          onChangeText={fields.setFloor}
          keyboardType="number-pad"
        />
        <TextFieldDescription>Ground floor is 1.</TextFieldDescription>
      </TextField>

      <AmenityChips value={fields.amenities} onChange={fields.setAmenities} />

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

      <FormMessage
        blocked={blocked}
        incomplete={canWrite ? missing : null}
        error={form.error}
      />

      <Button
        size="lg"
        className="rounded-full"
        onPress={onSubmit}
        isDisabled={!ready || !canWrite || blocked !== null}
      >
        <Button.Label>{form.progress ?? 'Save restroom'}</Button.Label>
      </Button>
    </FormScreen>
  );
}
