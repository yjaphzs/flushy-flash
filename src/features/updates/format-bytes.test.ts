import { formatBytes } from '@/features/updates/api';

describe('formatBytes', () => {
  it('reads an APK in megabytes', () => {
    expect(formatBytes(49 * 1024 * 1024)).toBe('49 MB');
    expect(formatBytes(71_234_567)).toBe('68 MB');
  });

  /**
   * The offline map pack is a few hundred kilobytes — the campus is about four
   * vector tiles. Without this branch `Math.round` reported every size below
   * 1.5 MB as "1 MB", so a download in progress showed one unchanging number.
   */
  it('reads the offline map pack in kilobytes', () => {
    expect(formatBytes(400 * 1024)).toBe('400 KB');
    expect(formatBytes(1023 * 1024)).toBe('1023 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
  });

  /** Never rounds a real, non-empty download down to nothing. */
  it('never shows 0 for bytes that exist', () => {
    expect(formatBytes(1)).toBe('1 KB');
    expect(formatBytes(0)).toBe('');
    expect(formatBytes(-1)).toBe('');
  });

  it('switches to gigabytes past 1024 MB', () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.0 GB');
  });
});
