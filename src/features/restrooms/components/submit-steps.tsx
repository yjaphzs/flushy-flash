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
 * ⚠️ **Only the active step is rendered, and that is safe** — a point worth
 * writing down because the opposite looks true. Every value lives in
 * `use-restroom-form.ts`, which is held by the SCREEN; these bodies are
 * stateless views over it and `PhotoPicker` has no `useState` at all. So
 * unmounting step 2 cannot drop a picked photo.
 *
 * What genuinely must not unmount is `/submit` itself, which is why steps are
 * screen state rather than routes: the placer is a full-screen sibling modal,
 * and losing the screen would lose the local file URIs with it.
 *
 * Rendering all four side by side in a translating track was the first attempt
 * and it has a plain defect: a row is as tall as its tallest child, so step 1 —
 * one button — inherited the height of step 4's chips and summary and sat in
 * about eight hundred points of void.
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
