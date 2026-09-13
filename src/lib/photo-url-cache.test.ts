import {
  forgetUrl,
  persistedUrls,
  rememberUrl,
  resetPhotoUrlCache,
} from '@/lib/photo-url-cache';

/*
  A one-file in-memory filesystem. `expo-file-system`'s File API is synchronous
  JSI, so it can be replaced with plain objects — no native module, no promises.
  Factory mock rather than automock: automock loads the real module to derive
  its shape, which pulls in the native binding.
*/
const mockDisk: { content: string | null; writes: number } = { content: null, writes: 0 };

jest.mock('expo-file-system', () => ({
  Paths: { document: 'document' },
  Directory: class {
    create() {}
  },
  File: class {
    get exists() {
      return mockDisk.content !== null;
    }
    textSync() {
      if (mockDisk.content === null) throw new Error('ENOENT');
      return mockDisk.content;
    }
    write(content: string) {
      mockDisk.content = content;
      mockDisk.writes += 1;
    }
  },
}));

/** A fresh launch: forget everything in memory, keep what is "on disk". */
const relaunch = () => resetPhotoUrlCache();

describe('photo url cache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockDisk.content = null;
    mockDisk.writes = 0;
    resetPhotoUrlCache();
  });

  afterEach(() => {
    resetPhotoUrlCache();
    jest.useRealTimers();
  });

  /**
   * The whole point. expo-image keys its disk cache by URL, so a URL that does
   * not survive the process takes every cached photo with it.
   */
  it('makes a resolved url available to the next launch', () => {
    rememberUrl('restrooms/r1/0-a.webp', 'https://example.test/a?token=1');
    jest.runAllTimers();

    relaunch();
    expect(persistedUrls()).toEqual({ 'restrooms/r1/0-a.webp': 'https://example.test/a?token=1' });
  });

  /** A map full of pins resolves in a burst; it must not be a burst of writes. */
  it('coalesces a burst into one write', () => {
    for (let i = 0; i < 20; i += 1) rememberUrl(`p${i}`, `https://example.test/${i}`);
    jest.runAllTimers();

    expect(mockDisk.writes).toBe(1);
    relaunch();
    expect(Object.keys(persistedUrls())).toHaveLength(20);
  });

  it('drops an entry whose resolution failed', () => {
    rememberUrl('gone', 'https://example.test/gone');
    jest.runAllTimers();

    forgetUrl('gone');
    jest.runAllTimers();

    relaunch();
    expect(persistedUrls()).toEqual({});
  });

  /**
   * Entries are only ever added — a deleted photo's path simply stops being
   * asked for, it does not announce itself — so the file has to be bounded.
   * Oldest-first, which is resolution order.
   */
  it('evicts oldest-first past the cap', () => {
    for (let i = 0; i < 420; i += 1) rememberUrl(`p${i}`, `https://example.test/${i}`);
    jest.runAllTimers();

    relaunch();
    const kept = persistedUrls();
    expect(Object.keys(kept)).toHaveLength(400);
    expect(kept.p0).toBeUndefined();
    expect(kept.p419).toBe('https://example.test/419');
  });

  /**
   * ⚠️ This is an optimisation, so it may not be load-bearing. A truncated or
   * hand-edited file must degrade to "no cache" rather than throwing on the
   * import that runs at app launch.
   */
  it('survives a corrupt file', () => {
    // The DEV diagnostic is the point of the branch; it just need not be noise.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockDisk.content = '{"a": "b"';
    relaunch();

    expect(persistedUrls()).toEqual({});
    expect(() => rememberUrl('p', 'https://example.test/p')).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('ignores entries that are not strings', () => {
    mockDisk.content = JSON.stringify({ good: 'https://example.test/g', bad: 42, worse: null });
    relaunch();

    expect(persistedUrls()).toEqual({ good: 'https://example.test/g' });
  });
});
