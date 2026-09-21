import {
  OFFLINE_GRACE_MS,
  useConnectionStore,
  type ConnectionSource,
} from '@/stores/connection-store';

const online = () => useConnectionStore.getState().online;
const report = (fromCache: boolean, source: ConnectionSource = 'restrooms') =>
  useConnectionStore.getState().report(source, fromCache);

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

  /**
   * ⚠️ **The bug this store shipped with, in v1.2.0.**
   *
   * Both campus listeners called one `report(fromCache)`, so whichever spoke
   * last won. `restrooms` reporting a live snapshot then `buildings` reporting
   * a cached one left an ONLINE phone stuck offline — with its writes blocked,
   * because `useWriteBlock` reads this — and nothing further arrived to correct
   * it. Found on the emulator, where `buildings` is empty and always answers
   * from cache while `restrooms` answers from the server.
   *
   * One server-backed listener is proof of a connection.
   */
  it('stays online when one listener is live and another answers from cache', () => {
    report(false, 'restrooms');
    report(true, 'buildings');
    jest.advanceTimersByTime(OFFLINE_GRACE_MS * 2);

    expect(online()).toBe(true);
  });

  it('goes offline only once every listener is answering from cache', () => {
    report(false, 'restrooms');
    report(true, 'buildings');
    jest.advanceTimersByTime(OFFLINE_GRACE_MS);
    expect(online()).toBe(true);

    report(true, 'restrooms');
    jest.advanceTimersByTime(OFFLINE_GRACE_MS);
    expect(online()).toBe(false);
  });

  it('comes back as soon as any one listener reaches the server again', () => {
    report(true, 'restrooms');
    report(true, 'buildings');
    jest.advanceTimersByTime(OFFLINE_GRACE_MS);
    expect(online()).toBe(false);

    report(false, 'buildings');
    expect(online()).toBe(true);
  });

  it('cancels a pending verdict on teardown', () => {
    report(true);
    useConnectionStore.getState().reset();
    jest.advanceTimersByTime(OFFLINE_GRACE_MS * 2);

    expect(online()).toBe(true);
  });
});
