import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { Callout } from '@/components/feedback/callout';
import { FormMessage } from '@/components/feedback/form-message';
import { FormScreen } from '@/components/layouts/form-screen';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import {
  TextField,
  TextFieldDescription,
  TextFieldInput,
  TextFieldLabel,
} from '@/components/forms/text-field';
import { JoinBenefits } from '@/features/auth/components/join-benefits';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import { PhotoPicker } from '@/features/restrooms/components/photo-picker';
import { ScorePicker } from '@/features/reviews/components/score-picker';
import {
  MAX_PHOTOS,
  deleteReview,
  pickPhotos,
  saveReview,
  useReviewForm,
} from '@/features/reviews/use-review-form';
import { useWriteBlock } from '@/hooks/use-write-block';
import { firebaseErrorMessage } from '@/lib/firebase-errors';
import { useCanWrite, useUid } from '@/stores/auth-store';
import { useCampusLoading, useRestrooms } from '@/stores/campus-store';

const MAX_TEXT = 2000;

/**
 * Write or edit a review. **One route, two modes.**
 *
 * There is no separate `/edit` route, and that is what "always yours to edit"
 * means structurally: the review's id is deterministic, so one document read
 * decides which mode this is, and there are never two routes to keep in sync.
 */
export default function WriteReviewScreen() {
  const { restroomId } = useLocalSearchParams<{ restroomId: string }>();
  const uid = useUid();
  const canWrite = useCanWrite();
  const requestWrite = useRequestWrite();
  const restrooms = useRestrooms();
  const campusLoading = useCampusLoading();
  const blocked = useWriteBlock();
  const form = useReviewForm(restroomId, uid);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const restroom = restrooms.find((r) => r.id === restroomId);

  async function onSave() {
    if (!restroomId || !uid || !restroom) return;
    setBusy(true);
    setError(null);
    try {
      await saveReview({
        restroomId,
        // Denormalised from the restroom, and written even when null — see the
        // docblock on createReview for why an ABSENT buildingId is unfixable.
        buildingId: restroom.buildingId,
        uid,
        mode: form.mode,
        rating: form.rating,
        cleanliness: form.cleanliness,
        text: form.text,
        photos: form.photos,
        originalPhotoIds: form.originalPhotoIds,
        onProgress: setProgress,
      });
      router.back();
    } catch (e) {
      // NOT `e.message`. `firebase-errors.ts` opens by arguing against exactly
      // that: Firestore's own strings are written for a developer reading a
      // stack trace, and "Missing or insufficient permissions" tells a student
      // nothing they can act on.
      setError(firebaseErrorMessage(e, 'save'));
      setBusy(false);
      setProgress(null);
    }
  }

  async function onDelete() {
    if (!restroomId || !uid) return;
    setBusy(true);
    try {
      await deleteReview(restroomId, uid, form.originalPhotoIds);
      router.back();
    } catch (e) {
      setError(firebaseErrorMessage(e, 'delete'));
      setBusy(false);
    }
  }

  // Same three-way branch as /restroom/[id]: "still loading" is not "gone".
  if (!restroom) {
    return (
      <FormScreen title={campusLoading ? 'Loading…' : 'Not found'} onBack={() => router.back()}>
        <View className="items-center py-8">
          {campusLoading ? <Spinner /> : <Text>This restroom is no longer listed.</Text>}
        </View>
      </FormScreen>
    );
  }

  const title = form.mode === 'edit' ? 'Edit your review' : 'Write a review';
  const ready = form.rating > 0 && form.cleanliness > 0 && !busy;

  return (
    <FormScreen
      title={title}
      subtitle={restroom.landmark || 'This restroom'}
      onBack={() => router.back()}
      avoidsKeyboard
    >
      {/*
        Defence in depth, copied from submit.tsx rather than invented: /review
        is a deep link and a guest can arrive cold. Showing what an account buys
        beats showing a form whose write firestore.rules refuses.
      */}
      {canWrite ? null : (
        <View className="gap-4">
          <JoinBenefits />
          <Button
            size="lg"
            className="rounded-full"
            onPress={() => requestWrite({ href: `/review/${restroomId}`, reason: 'review' })}
          >
            <Button.Label>Create an account to review this</Button.Label>
          </Button>
        </View>
      )}

      {form.loading ? (
        <View className="items-center py-8">
          <Spinner />
        </View>
      ) : null}

      {/*
        ⚠️ **The form is NOT offered when the prefill failed.** Falling through
        would present a blank create form to someone who already has a review
        here, and posting it is denied every time — see the catch in
        `use-review-form.ts` for why. A retry is the only honest control.
      */}
      {canWrite && form.failed ? (
        <View className="gap-3">
          <Callout tone="danger">
            <Text type="body-sm">
              Could not open your review. Posting now would replace something you
              cannot see.
            </Text>
          </Callout>
          <Button variant="secondary" size="lg" className="rounded-full" onPress={form.retry}>
            <Button.Label>Try again</Button.Label>
          </Button>
        </View>
      ) : null}

      {canWrite && !form.loading && !form.failed ? (
        <>
          {/*
            Overall is the headline question and is drawn as one — larger stars,
            a bigger label, its own hint. Cleanliness sits beneath as a detail.
            Two identically-sized pickers read as a survey rather than as a
            rating with a follow-up.

            Both are still REQUIRED: firestore.rules calls
            isValidScore(incoming().cleanliness), and reading an absent map key
            is an evaluation error in rules — so a write that omits it is
            denied, not merely unvalidated. Emphasis is presentation only.
          */}
          <ScorePicker
            label="Overall"
            value={form.rating}
            onChange={form.setRating}
            emphasis="primary"
            hint="Would you send a friend here?"
          />
          <ScorePicker
            label="Cleanliness"
            value={form.cleanliness}
            onChange={form.setCleanliness}
          />

          <TextField>
            <TextFieldLabel>Anything worth knowing?</TextFieldLabel>
            <TextFieldInput
              value={form.text}
              onChangeText={form.setText}
              placeholder="Clean, has tissue, door locks properly"
              multiline
              maxLength={MAX_TEXT}
            />
            <TextFieldDescription>
              {/* A rating-only review is fine — the rules permit empty text. */}
              Optional. {form.text.length} of {MAX_TEXT}.
            </TextFieldDescription>
          </TextField>

          <PhotoPicker
            photos={form.photos}
            onChange={form.setPhotos}
            max={MAX_PHOTOS}
            pick={pickPhotos}
          />

          <FormMessage blocked={blocked} error={error} />

          <Button
            size="lg"
            className="rounded-full"
            onPress={onSave}
            isDisabled={!ready || blocked !== null}
          >
            <Button.Label>
              {progress ?? (form.mode === 'edit' ? 'Save changes' : 'Post review')}
            </Button.Label>
          </Button>

          {form.mode === 'edit' ? (
            <Button
              variant="danger-soft"
              size="lg"
              className="rounded-full"
              onPress={onDelete}
              isDisabled={busy || blocked !== null}
            >
              <Button.Label>Delete review</Button.Label>
            </Button>
          ) : null}
        </>
      ) : null}
    </FormScreen>
  );
}
