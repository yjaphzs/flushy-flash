import { OFFLINE_GRACE_MS, useConnectionStore } from '@/stores/connection-store';

const online = () => useConnectionStore.getState().online;
const report = (fromCache: boolean) => useConnectionStore.getState().report(fromCache);

describe('connection store', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useConnectionStore.getState().reset();
  });

  afterEach(() => {
    useConnectionStore.getState().reset();
    jest.useRealTimers();
  });

  it('starts optimistic, so nothing renders an offline state before it is known', () => {
    expect(online()).toBe(true);
  });

  /**
   * The whole reason the grace period exists.
   *
   * A healthy cold start serves the disk cache before the server answers, so the
   * FIRST snapshot of every launch has `fromCache: true`. Without the delay the
   * offline copy appears on every single launch and then vanishes, which reads
   * as a glitch rather than as information.
   */
  it('does not declare offline on the first cached snapshot of a launch', () => {
    report(true);
    jest.advanceTimersByTime(OFFLINE_GRACE_MS - 1);
    expect(online()).toBe(true);

    report(false);
    jest.advanceTimersByTime(OFFLINE_GRACE_MS * 2);
    expect(online()).toBe(true);
  });

  it('declares offline once the cache keeps answering for the whole grace period', () => {
    report(true);
    jest.advanceTimersByTime(OFFLINE_GRACE_MS);
    expect(online()).toBe(false);
  });

  /**
   * Asymmetric on purpose: a server-backed snapshot is proof, so coming back
   * needs no corroboration and no wait. A student walking back into signal
   * should not sit under a stale offline banner for two more seconds.
   */
  it('comes back instantly on a server-backed snapshot', () => {
    report(true);
    jest.advanceTimersByTime(OFFLINE_GRACE_MS);
    expect(online()).toBe(false);

    report(false);
    expect(online()).toBe(true);
  });

  /**
   * Both campus listeners report, and a snapshot fires on every metadata change
   * — so re-arming the timer per report would push the verdict out for as long
   * as anything kept talking, and the app would never admit to being offline.
   */
  it('does not restart the countdown on each cached snapshot', () => {
    report(true);
    jest.advanceTimersByTime(OFFLINE_GRACE_MS - 100);
    report(true);
    report(true);
    jest.advanceTimersByTime(100);

    expect(online()).toBe(false);
  });

  it('cancels a pending verdict on teardown', () => {
    report(true);
    useConnectionStore.getState().reset();
    jest.advanceTimersByTime(OFFLINE_GRACE_MS * 2);

    expect(online()).toBe(true);
  });
});
