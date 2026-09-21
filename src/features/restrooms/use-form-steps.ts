import { useCallback, useState } from 'react';

import type { RestroomFormState } from '@/features/restrooms/use-restroom-form';

/**
 * The add-a-restroom form, as four steps instead of one long scroll.
 *
 * Seven controls on one page means a first-time contributor meets all of them
 * at once, and the one that matters most — the pin — is the one they scroll
 * past. Grouped by the question being answered rather than by control type.
 *
 * ⚠️ **Steps are state, not routes, and that is forced rather than chosen.**
 * `(app)/_layout.tsx` and `pin-draft-store.ts` both record that `/submit` must
 * stay mounted while the full-screen placer is open, because picked photos are
 * local file URIs that a remount would throw away. A step-per-route stepper
 * loses every photo the moment the user adjusts the pin.
 *
 * ⚠️ **Add only.** `/edit-restroom` keeps its single scrolling page on purpose:
 * marking a restroom out of order is the quickest and most time-sensitive edit
 * there is, and a wizard would make it the slowest. Both screens still share
 * `use-restroom-form.ts`, so the FIELDS cannot drift — only the presentation.
 */

export type FormStep = {
  /** Shown in the caption and announced to screen readers. */
  title: string;
  /** One line under the title saying what this step is for. */
  blurb: string;
  /**
   * Why this step is not finished, or null when it is.
   *
   * A string rather than a boolean so it can feed `FormMessage`'s `incomplete`
   * slot unchanged — the app's standing rule is that a control never looks dead
   * without saying why (`use-auth-gate`'s docblock).
   */
  missing: (form: RestroomFormState) => string | null;
};

export const STEPS: readonly FormStep[] = [
  {
    title: 'Where',
    blurb: 'Drop the pin on the door, not the middle of the building.',
    missing: (f) => (f.point ? null : 'Drop a pin on the map first.'),
  },
  {
    title: 'Photo',
    blurb: 'The entrance is the one that helps.',
    missing: (f) => (f.photos.length > 0 ? null : 'Add at least one photo.'),
  },
  {
    title: 'Finding it',
    blurb: 'How someone who has never been here would recognise it.',
    missing: (f) =>
      f.landmark.trim().length > 0 ? null : 'Add a landmark so people can find it.',
  },
  {
    // Everything optional lives here, so the last step can never block a save.
    title: 'Details',
    blurb: 'All optional — leave anything you are unsure about blank.',
    missing: () => null,
  },
];

export type FormStepsState = {
  index: number;
  step: FormStep;
  isFirst: boolean;
  isLast: boolean;
  /** Why the CURRENT step cannot be left, or null. */
  missing: string | null;
  /** The furthest step reachable right now — the first unfinished one. */
  furthest: number;
  next: () => void;
  back: () => void;
  /** Ignored for a step past `furthest`; see the docblock. */
  goTo: (to: number) => void;
};

export function useFormSteps(form: RestroomFormState): FormStepsState {
  const [index, setIndex] = useState(0);

  const missingAt = (i: number) => STEPS[i].missing(form);

  /**
   * The first step that is not finished.
   *
   * ⚠️ **This is what stops the indicator becoming a skip button.** Tapping
   * ahead to "Details" on an empty form would land the user on a page whose
   * Save is dead for a reason three steps behind them — which is the exact
   * shape the app forbids elsewhere. Going BACK is always free.
   */
  const furthest = STEPS.findIndex((_, i) => missingAt(i) !== null);
  const reachable = furthest === -1 ? STEPS.length - 1 : furthest;

  const goTo = useCallback(
    (to: number) => {
      if (to < 0 || to >= STEPS.length) return;
      // Backwards is always allowed; forwards only as far as the work reaches.
      if (to > index && to > reachable) return;
      setIndex(to);
    },
    [index, reachable],
  );

  // Stable references: `next` is handed to a gesture worklet through runOnJS,
  // and a new function identity every render would re-create the gesture.
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const back = useCallback(() => goTo(index - 1), [goTo, index]);

  return {
    index,
    step: STEPS[index],
    isFirst: index === 0,
    isLast: index === STEPS.length - 1,
    missing: missingAt(index),
    furthest: reachable,
    next,
    back,
    goTo,
  };
}
