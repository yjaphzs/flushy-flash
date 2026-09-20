import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/feedback/callout';
import { Chip } from '@/components/ui/chip';
import { FormMessage } from '@/components/feedback/form-message';
import { FormScreen } from '@/components/layouts/form-screen';
import { PinField } from '@/features/restrooms/components/pin-field';
import { PhotoPicker } from '@/features/restrooms/components/photo-picker';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import {
  TextField,
  TextFieldDescription,
  TextFieldInput,
  TextFieldLabel,
} from '@/components/forms/text-field';
import { AccessChips, AmenityChips } from '@/features/restrooms/components/amenity-chips';
import { STATUS } from '@/features/restrooms/labels';
import { useEditRestroom } from '@/features/restrooms/use-edit-restroom';
import { useRestroomForm } from '@/features/restrooms/use-restroom-form';
import { useWriteBlock } from '@/hooks/use-write-block';
import { useUid } from '@/stores/auth-store';
import { useCampusLoading, useRestrooms } from '@/stores/campus-store';
import type { RestroomStatus } from '@/lib/types';

const STATUSES = Object.keys(STATUS) as RestroomStatus[];

/**
 * Editing a restroom you added.
 *
 * ⚠️ **A SIBLING route, like `pick-location` and for the same reason.** The
 * placer returns its point through `pin-draft-store`, so this screen must stay
 * mounted while the placer is open or it loses every photo the user picked.
 *
 * Simpler than the review composer in one respect: there is no prefill read and
 * so no failure branch. The restroom is already in `campus-store`, which is
 * where `/restroom/[id]` and `my-restrooms` both read it from.
 *
 * ⚠️ **Nothing here needed a rules change.** `firestore.rules` has permitted the
 * author to change exactly this field set since the trust system landed, and the
 * attack matrix already asserts it. The client simply never called it — which is
 * why `status` has been rendered in two places and settable in none.
 */
export default function EditRestroomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useUid();
  const blocked = useWriteBlock();
  const restrooms = useRestrooms();
  const loading = useCampusLoading();
  const form = useEditRestroom();

  const restroom = restrooms.find((r) => r.id === id);
  const fields = useRestroomForm(restroom);

  const mine = restroom !== undefined && uid !== null && restroom.createdBy === uid;

  async function onSave() {
    if (!restroom || !uid) return;
    const saved = await form.save({
      id: restroom.id,
      point: fields.point,
      buildingId: fields.building?.id ?? null,
      floor: fields.floor,
      landmark: fields.landmark,
      locationNote: fields.locationNote,
      amenities: fields.amenities,
      genderedAs: fields.genderedAs,
      status: fields.status,
      photos: fields.photos,
      originalPhotoIds: fields.originalPhotoIds,
      uid,
    });
    if (saved) router.back();
  }

  // Same three-way branch as /restroom/[id]: "still loading" is not "gone".
  if (!restroom || !mine) {
    return (
      <FormScreen
        title={loading && !restroom ? 'Loading…' : 'Not yours to edit'}
        onBack={() => router.back()}
      >
        <View className="items-center py-8">
          {loading && !restroom ? (
            <Spinner />
          ) : (
            <Text type="body-sm" color="muted" align="center">
              Only the person who added a restroom can edit it. You can still
              confirm it, report it, or write a review.
            </Text>
          )}
        </View>
      </FormScreen>
    );
  }

  const ready = Boolean(fields.point) && fields.landmark.trim().length > 0 && !form.busy;

  return (
    <FormScreen
      title="Edit this restroom"
      subtitle="Keep it accurate — people are walking here because of what it says."
      onBack={() => router.back()}
      avoidsKeyboard
    >
      {/*
        ⚠️ The badge survives a relocation, and that is worth saying out loud.

        `firestore.rules` pins `verified`, `confirmCount` and `trustScore`
        against every client write — which protects them from being forged, and
        also means they do NOT follow the pin when it moves. An entry two
        students vouched for at one door keeps their vouches at a different one.
        Resetting trust on a move is a change to the trust system and belongs in
        its own decision, so for now the honest move is to say so.
      */}
      {fields.movedPin && (restroom.verified || restroom.confirmCount > 0) ? (
        <Callout tone="danger" testID="edit-moved-pin">
          <Text type="body-sm">
            You have moved a pin other people confirmed. Their confirmations stay
            with it. If this is a different restroom, add it as a new one instead.
          </Text>
        </Callout>
      ) : null}

      <PinField point={fields.point} building={fields.building} />

      <View className="gap-2">
        <Text type="body" weight="semibold">
          Is it usable right now?
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {STATUSES.map((value) => (
            <Chip
              key={value}
              variant={fields.status === value ? 'primary' : 'secondary'}
              onPress={() => fields.setStatus(value)}
            >
              <Chip.Label>{STATUS[value].label}</Chip.Label>
            </Chip>
          ))}
        </View>
        <Text type="body-xs" color="muted">
          Out of order and Closed show on the map, so people can skip it.
        </Text>
      </View>

      {/*
        Prompted, never blocked. The photo requirement is for NEW restrooms; an
        entry added before that rule existed should not have its directions held
        hostage behind a camera roll, and the fix someone came here to make is
        usually unrelated.
      */}
      {fields.photos.length === 0 ? (
        <Callout tone="info" icon="image" testID="edit-no-photos">
          <Text type="body-sm">
            This one has no photo yet. Adding one is the single most useful edit —
            it is how someone knows they found the right door.
          </Text>
        </Callout>
      ) : null}

      <PhotoPicker
        photos={fields.photos}
        onChange={fields.setPhotos}
        max={form.maxPhotos}
        pick={form.pickPhotos}
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

      <FormMessage blocked={blocked} error={form.error} />

      <Button
        size="lg"
        className="rounded-full"
        onPress={onSave}
        isDisabled={!ready || blocked !== null}
      >
        <Button.Label>{form.progress ?? 'Save changes'}</Button.Label>
      </Button>
    </FormScreen>
  );
}
