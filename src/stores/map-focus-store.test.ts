import { useMapFocusStore } from '@/stores/map-focus-store';

const reset = () =>
  useMapFocusStore.setState({ focus: null, outcome: 'idle', label: null, attempt: 0 });

const POINT = { lat: 15.7313, lng: 120.9302 };

describe('map focus store', () => {
  beforeEach(reset);

  it('reports locating while a search is in flight', () => {
    const { begin } = useMapFocusStore.getState();
    begin();
    expect(useMapFocusStore.getState().outcome).toBe('locating');
  });

  it('records the result of the current attempt', () => {
    const { begin, succeed } = useMapFocusStore.getState();
    const attempt = begin();
    succeed(attempt, POINT, 'CLSU Lagoon · 120 m');

    const s = useMapFocusStore.getState();
    expect(s.outcome).toBe('found');
    expect(s.label).toBe('CLSU Lagoon · 120 m');
    expect(s.focus).toMatchObject(POINT);
  });

  /**
   * The reason the attempt counter exists. `getCurrentFix()` takes no abort
   * signal, so cancelling cannot stop the request — only disown it. Without
   * this, a fix landing after the user dismissed the dialog would reopen the
   * banner and fly the camera somewhere they did not ask to go.
   */
  it('ignores a result that arrives after cancel', () => {
    const { begin, succeed, cancel } = useMapFocusStore.getState();
    const attempt = begin();
    cancel();

    succeed(attempt, POINT, 'too late');

    const s = useMapFocusStore.getState();
    expect(s.outcome).toBe('idle');
    expect(s.label).toBeNull();
    expect(s.focus).toBeNull();
  });

  it('ignores a failure that arrives after cancel', () => {
    const { begin, fail, cancel } = useMapFocusStore.getState();
    const attempt = begin();
    cancel();

    fail(attempt, 'unavailable');
    expect(useMapFocusStore.getState().outcome).toBe('idle');
  });

  /** A slow first search must not overwrite a faster second one. */
  it('ignores a superseded attempt', () => {
    const { begin, succeed } = useMapFocusStore.getState();
    const first = begin();
    const second = begin();

    succeed(second, POINT, 'second');
    succeed(first, { lat: 0, lng: 0 }, 'first, but stale');

    const s = useMapFocusStore.getState();
    expect(s.label).toBe('second');
    expect(s.focus).toMatchObject(POINT);
  });

  /**
   * The camera only re-fires when the nonce changes, so pressing the button
   * twice from the same spot has to produce a new one — otherwise an identical
   * target is a no-op and the button feels broken.
   */
  it('bumps the nonce on every accepted result', () => {
    const { begin, succeed } = useMapFocusStore.getState();
    succeed(begin(), POINT, 'first');
    const first = useMapFocusStore.getState().focus?.nonce;

    succeed(begin(), POINT, 'again');
    const second = useMapFocusStore.getState().focus?.nonce;

    expect(second).toBeGreaterThan(first!);
  });

  /** What the auto-dismiss timer calls; the banners used to stay forever. */
  it('clears a settled message on dismiss', () => {
    const { begin, succeed, dismiss } = useMapFocusStore.getState();
    succeed(begin(), POINT, 'CLSU Lagoon · 120 m');

    dismiss();

    const s = useMapFocusStore.getState();
    expect(s.outcome).toBe('idle');
    expect(s.label).toBeNull();
    // The camera target survives: dismissing a message must not undo the move.
    expect(s.focus).toMatchObject(POINT);
  });
});
