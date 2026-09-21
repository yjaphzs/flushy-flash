import { renderHook, act } from '@testing-library/react-native';

import { STEPS, useFormSteps } from '@/features/restrooms/use-form-steps';
import type { RestroomFormState } from '@/features/restrooms/use-restroom-form';

/*
  A form is only ever READ by the step machine, so a partial stand-in is enough
  and keeps the test honest about what it actually depends on: a point, some
  photos and a landmark.
*/
const form = (over: Partial<RestroomFormState> = {}): RestroomFormState =>
  ({
    point: null,
    photos: [],
    landmark: '',
    ...over,
  }) as RestroomFormState;

const complete = form({
  point: { lat: 15.7313, lng: 120.9302 },
  photos: [{ kind: 'new', uri: 'file:///a.webp' }],
  landmark: 'CLSU Lagoon',
});

describe('useFormSteps', () => {
  it('opens on the location step', async () => {
    const { result } = await renderHook(() => useFormSteps(form()));

    expect(result.current.index).toBe(0);
    expect(result.current.step.title).toBe('Where');
    expect(result.current.isFirst).toBe(true);
    expect(result.current.isLast).toBe(false);
  });

  it('names what the current step is waiting for', async () => {
    const { result } = await renderHook(() => useFormSteps(form()));
    expect(result.current.missing).toMatch(/pin/i);
  });

  /**
   * ⚠️ The rule the whole machine exists for.
   *
   * Without it the indicator is a skip button: tapping ahead to Details on an
   * empty form lands on a page whose Save is dead for a reason three steps
   * behind, which is the shape `use-auth-gate`'s docblock forbids app-wide.
   */
  it('refuses to advance past an unfinished step', async () => {
    const { result } = await renderHook(() => useFormSteps(form()));

    await act(async () => result.current.next());
    expect(result.current.index).toBe(0);

    await act(async () => result.current.goTo(3));
    expect(result.current.index).toBe(0);
  });

  it('advances once the step is satisfied', async () => {
    const { result } = await renderHook(() =>
      useFormSteps(form({ point: { lat: 15.73, lng: 120.93 } })),
    );

    await act(async () => result.current.next());
    expect(result.current.index).toBe(1);
    expect(result.current.step.title).toBe('Photo');
  });

  /** Going back is always free — a wizard you cannot reverse is a trap. */
  it('always allows going back, even from an unfinished step', async () => {
    const { result } = await renderHook(() => useFormSteps(complete));

    await act(async () => result.current.goTo(3));
    expect(result.current.index).toBe(3);

    await act(async () => result.current.goTo(0));
    expect(result.current.index).toBe(0);
  });

  it('lets a completed form reach any step', async () => {
    const { result } = await renderHook(() => useFormSteps(complete));

    expect(result.current.furthest).toBe(STEPS.length - 1);
    await act(async () => result.current.goTo(3));
    expect(result.current.isLast).toBe(true);
    expect(result.current.missing).toBeNull();
  });

  /** The last step holds only optional fields, so it can never block Save. */
  it('never blocks on the final step', async () => {
    expect(STEPS[STEPS.length - 1].missing(form())).toBeNull();
  });

  it('stops at both ends rather than running off', async () => {
    const { result } = await renderHook(() => useFormSteps(complete));

    await act(async () => result.current.back());
    expect(result.current.index).toBe(0);

    for (let i = 0; i < STEPS.length; i += 1) await act(async () => result.current.next());
    expect(result.current.index).toBe(STEPS.length - 1);
  });

  /** Whitespace is not a landmark. */
  it('does not accept a blank landmark', async () => {
    const nearly = form({
      point: { lat: 15.73, lng: 120.93 },
      photos: [{ kind: 'new', uri: 'file:///a.webp' }],
      landmark: '   ',
    });
    const { result } = await renderHook(() => useFormSteps(nearly));

    expect(result.current.furthest).toBe(2);
    await act(async () => result.current.goTo(3));
    expect(result.current.index).toBe(0);
  });
});
