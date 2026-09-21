import {
  DEFAULT_MAP_THEME,
  loadMapTheme,
  saveMapTheme,
} from '@/lib/map-theme-storage';

/*
  The same one-file in-memory filesystem `photo-url-cache.test.ts` uses.
  expo-file-system's File API is synchronous JSI, so it can be replaced with
  plain objects — no native module, no promises. A factory mock rather than
  automock, which would load the real module to derive its shape and pull in
  the native binding.
*/
const disk: { content: string | null } = { content: null };

jest.mock('expo-file-system', () => ({
  Paths: { document: 'document' },
  Directory: class {
    create() {}
  },
  File: class {
    get exists() {
      return disk.content !== null;
    }
    textSync() {
      if (disk.content === null) throw new Error('ENOENT');
      return disk.content;
    }
    write(content: string) {
      disk.content = content;
    }
  },
}));

describe('map theme storage', () => {
  beforeEach(() => {
    disk.content = null;
  });

  /** A fresh install must behave exactly as it did before the setting existed. */
  it('defaults to following the system when nothing is stored', () => {
    expect(loadMapTheme()).toBe('system');
    expect(DEFAULT_MAP_THEME).toBe('system');
  });

  it('round-trips a choice', () => {
    saveMapTheme('dark');
    expect(loadMapTheme()).toBe('dark');
  });

  /**
   * ⚠️ The reason `loadMapTheme` validates rather than casting. The value goes
   * straight into a style lookup, and a half-written or hand-edited file would
   * otherwise put an unknown string there.
   */
  it('falls back rather than trusting an unknown value', () => {
    disk.content = JSON.stringify({ theme: 'satellite' });
    expect(loadMapTheme()).toBe('system');
  });

  it('survives a corrupt file', () => {
    disk.content = 'not json {';
    expect(loadMapTheme()).toBe('system');
  });

  it('survives a file of the wrong shape', () => {
    disk.content = JSON.stringify(['dark']);
    expect(loadMapTheme()).toBe('system');
  });
});
