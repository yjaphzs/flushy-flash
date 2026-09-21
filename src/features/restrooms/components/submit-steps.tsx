import {
  TextField,
  TextFieldDescription,
  TextFieldInput,
  TextFieldLabel,
} from '@/components/forms/text-field';
import { View } from '@/components/ui/view';
import { AccessChips, AmenityChips } from '@/features/restrooms/components/amenity-chips';
import { PhotoPicker } from '@/features/restrooms/components/photo-picker';
import { PinField } from '@/features/restrooms/components/pin-field';
import { SubmitSummary } from '@/features/restrooms/components/submit-summary';
import type { PickedPhoto } from '@/features/restrooms/photos';
import type { RestroomFormState } from '@/features/restrooms/use-restroom-form';

/**
 * The four step bodies of the add form.
 *
 * Nothing here is new markup — it is the same controls `submit.tsx` rendered in
 * one column, cut into the four questions a contributor is actually answering.
 * Keeping them in one file rather than four means the whole sequence is
 * readable at once, which is the thing that goes wrong when a wizard's steps
 * drift apart.
 *
 * ⚠️ **Every step stays MOUNTED.** The track translates; steps are not
 * conditionally rendered. Unmounting step 2 would drop the picked photos, which
 * are local file URIs — the same constraint that forces steps to be state
 * rather than routes.
 */

export type SubmitStepsProps = {
  fields: RestroomFormState;
  maxPhotos: number;
  pickPhotos: (remaining: number) => Promise<PickedPhoto[]>;
  /** Jump to a step from the summary. */
  onJump: (index: number) => void;
};

export function StepWhere({ fields }: { fields: RestroomFormState }) {
  return <PinField point={fields.point} building={fields.building} />;
}

export function StepPhoto({ fields, maxPhotos, pickPhotos }: Omit<SubmitStepsProps, 'onJump'>) {
  return (
    <PhotoPicker
      photos={fields.photos}
      onChange={fields.setPhotos}
      max={maxPhotos}
      pick={pickPhotos}
      hint="At least one, so people can tell they have found the right door."
    />
  );
}

export function StepFinding({ fields }: { fields: RestroomFormState }) {
  return (
    <View className="gap-6">
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
    </View>
  );
}

export function StepDetails({ fields, onJump }: { fields: RestroomFormState; onJump: (i: number) => void }) {
  return (
    <View className="gap-6">
      <AccessChips value={fields.genderedAs} onChange={fields.setGenderedAs} />
      <AmenityChips value={fields.amenities} onChange={fields.setAmenities} />
      {/*
        The recap turns the last page into a confirmation rather than just the
        last form page — everything answered so far, each row a way back to the
        step that set it.
      */}
      <SubmitSummary fields={fields} onJump={onJump} />
    </View>
  );
}
