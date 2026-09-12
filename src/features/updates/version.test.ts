import { compareVersions, isNewer } from '@/features/updates/version';

describe('compareVersions', () => {
  it('orders by major, then minor, then patch', () => {
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.2.0', '1.1.9')).toBe(1);
    expect(compareVersions('1.0.2', '1.0.1')).toBe(1);
    expect(compareVersions('1.0.1', '1.0.2')).toBe(-1);
    expect(compareVersions('1.0.1', '1.0.1')).toBe(0);
  });

  it('compares numerically, not lexically', () => {
    // The bug a string compare would ship: "10" < "9" as text.
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersions('1.0.10', '1.0.9')).toBe(1);
  });

  it('tolerates the leading v the git tag carries', () => {
    expect(compareVersions('v1.0.2', '1.0.1')).toBe(1);
    expect(compareVersions('v1.0.1', 'v1.0.1')).toBe(0);
  });

  it('treats missing segments as zero', () => {
    expect(compareVersions('1.1', '1.1.0')).toBe(0);
    expect(compareVersions('2', '1.9.9')).toBe(1);
  });

  /** One input comes off the network, so nothing here may throw. */
  it('never throws on junk, and sorts it below a real version', () => {
    for (const junk of ['', '   ', 'latest', 'not.a.version', '???']) {
      expect(() => compareVersions(junk, '1.0.0')).not.toThrow();
      expect(compareVersions(junk, '1.0.0')).toBe(-1);
    }
  });

  it('ignores a pre-release suffix rather than mis-ordering it', () => {
    expect(compareVersions('1.0.2-beta.1', '1.0.2')).toBe(0);
  });
});

describe('isNewer', () => {
  it('offers only a strictly greater version', () => {
    expect(isNewer('1.0.2', '1.0.1')).toBe(true);
    expect(isNewer('1.0.1', '1.0.1')).toBe(false);
  });

  /**
   * A dev build running ahead of the latest tag is the normal state of this
   * repo between releases. Offering to "update" onto an older APK would be an
   * unprompted downgrade, which Android refuses to install anyway.
   */
  it('never offers a downgrade', () => {
    expect(isNewer('1.0.1', '1.0.2')).toBe(false);
    expect(isNewer('1.0.0', '2.0.0')).toBe(false);
  });
});
