import { useEffect, useRef } from 'react';
import { router } from 'expo-router';

import { FormMessage } from '@/components/feedback/form-message';
import { FormScreen } from '@/components/layouts/form-screen';
import { StepIndicator } from '@/components/common/step-indicator';
import { Button } from '@/components/ui/button';
import { Gesture, GestureDetector } from '@/components/ui/gesture';
import {
  Animated,
  SPRING,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from '@/components/ui/motion';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { JoinBenefits } from '@/features/auth/components/join-benefits';
import { useRequestWrite } from '@/features/auth/use-auth-gate';
import {
  StepDetails,
  StepFinding,
  StepPhoto,
  StepWhere,
} from '@/features/restrooms/components/submit-steps';
import { usePendingQuota } from '@/features/restrooms/pending-quota';
import { STEPS, useFormSteps } from '@/features/restrooms/use-form-steps';
import { useRestroomForm } from '@/features/restrooms/use-restroom-form';
import { useSubmitRestroom } from '@/features/restrooms/use-submit-restroom';
import { useWriteBlock } from '@/hooks/use-write-block';
import { useCanWrite, useUid } from '@/stores/auth-store';

/** Sideways travel before the pan claims the touch from the vertical scroll. */
const SWIPE_SLOP = 12;
/** How far a drag must go to count as a step rather than a wobble. */
const SWIPE_COMMIT = 60;
/** How far a newly shown step travels in. Short — it is a hint, not a journey. */
const SLIDE_IN = 36;

const TITLES = STEPS.map((s) => s.title);

/**
 * Add a restroom, four steps at a time.
 *
 * ⚠️ **The steps are in-screen state, not routes.** A step-per-route stepper
 * would unmount this screen when the full-screen placer opens, and the picked
 * photos are local file URIs held by `useRestroomForm` here — see
 * `pin-draft-store.ts`. Unmounting an individual STEP is harmless, though; the
 * bodies are stateless views over that hook.
 *
 * ⚠️ **Next lives in the scroll flow, not a fixed footer.** There is no
 * KeyboardAvoidingView in this codebase and no keyboard-controller package;
 * `avoidsKeyboard` is one iOS ScrollView prop that pads scroll CONTENT, so a
 * pinned footer would sit under the keyboard on iOS exactly when step 3's text
 * fields are open. Every other form in the app ends with its button in flow.
 */
export default function SubmitRestroomScreen() {
  const uid = useUid();
  const canWrite = useCanWrite();
  const requestWrite = useRequestWrite();
  const blocked = useWriteBlock();
  const reduced = useReducedMotion();
  const form = useSubmitRestroom();
  const fields = useRestroomForm();
  const steps = useFormSteps(fields);

  const quota = usePendingQuota(uid);

  /*
    One step is rendered at a time and slides in from the side it came from.

    ⚠️ A four-wide track was the first attempt and had to go: a row is as tall
    as its tallest child, so step 1 — a single button — inherited step 4's
    height and sat in a screenful of nothing.

    Written in an effect and read in a worklet. A worklet closing over
    `steps.index` would re-run on change and SNAP, which looks exactly like no
    animation at all (AGENTS.md §3).
  */
  const enter = useSharedValue(0);
  const drag = useSharedValue(0);
  const seen = useRef(steps.index);

  useEffect(() => {
    const from = steps.index >= seen.current ? SLIDE_IN : -SLIDE_IN;
    seen.current = steps.index;
    if (reduced) {
      enter.set(0);
      return;
    }
    enter.set(from);
    enter.set(withSpring(0, SPRING));
  }, [steps.index, enter, reduced]);

  const stepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: enter.get() + drag.get() }],
  }));

  /*
    ⚠️ `activeOffsetX` is what keeps the form scrollable: without it a vertical
    drag is claimed by this pan and the page cannot move. Forward is refused
    while the step is unfinished — the track springs back, which says "not yet"
    without a dialog.
  */
  const swipe = Gesture.Pan()
    .activeOffsetX([-SWIPE_SLOP, SWIPE_SLOP])
    .onUpdate((e) => {
      const forward = e.translationX < 0;
      const blockedWay = forward ? steps.isLast || steps.missing !== null : steps.isFirst;
      // Rubber-band rather than refuse outright, so the gesture still responds.
      drag.set(blockedWay ? e.translationX / 4 : e.translationX);
    })
    .onEnd((e) => {
      const far = Math.abs(e.translationX) > SWIPE_COMMIT;
      if (far && e.translationX < 0) runOnJS(steps.next)();
      else if (far && e.translationX > 0) runOnJS(steps.back)();
      drag.set(withSpring(0, SPRING));
    });

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

  const saving = steps.isLast;
  const acting = saving ? onSubmit : steps.next;
  const stuck = steps.missing !== null || form.busy || (saving && (!canWrite || quota.full));

  return (
    <FormScreen
      title="Add a restroom"
      subtitle={steps.step.blurb}
      onBack={() => router.back()}
      avoidsKeyboard
    >
      <StepIndicator
        titles={TITLES}
        index={steps.index}
        furthest={steps.furthest}
        onSelect={steps.goTo}
      />

      <GestureDetector gesture={swipe}>
        <Animated.View style={stepStyle}>
          {steps.index === 0 ? <StepWhere fields={fields} /> : null}
          {steps.index === 1 ? (
            <StepPhoto fields={fields} maxPhotos={form.maxPhotos} pickPhotos={form.pickPhotos} />
          ) : null}
          {steps.index === 2 ? <StepFinding fields={fields} /> : null}
          {steps.index === 3 ? <StepDetails fields={fields} onJump={steps.goTo} /> : null}
        </Animated.View>
      </GestureDetector>

      {/*
        Only once it matters, and only on the step that saves. A quota line on
        step one is a rule looking for a rule-breaker.
      */}
      {saving && canWrite && quota.used > 0 ? (
        <Text
          type="body-sm"
          color={quota.full ? undefined : 'muted'}
          className={quota.full ? 'text-danger' : undefined}
        >
          {quota.full
            ? `You have ${quota.cap} restrooms waiting to be confirmed. Once students confirm one, you can add another.`
            : `${quota.used} of ${quota.cap} pending. Verified restrooms do not count.`}
        </Text>
      ) : null}

      {/*
        Defence in depth, on the last step where it is actually relevant.
        /submit is a deep link and a guest can arrive cold.
      */}
      {saving && !canWrite ? (
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
      ) : null}

      <FormMessage blocked={blocked} incomplete={steps.missing} error={form.error} />

      <View className="flex-row gap-3">
        {steps.isFirst ? null : (
          <Button variant="secondary" size="lg" className="flex-1 rounded-full" onPress={steps.back}>
            <Button.Label>Back</Button.Label>
          </Button>
        )}
        <Button
          size="lg"
          className="flex-1 rounded-full"
          onPress={() => void acting()}
          isDisabled={stuck || (saving && blocked !== null)}
        >
          <Button.Label>{form.progress ?? (saving ? 'Save restroom' : 'Next')}</Button.Label>
        </Button>
      </View>
    </FormScreen>
  );
}
