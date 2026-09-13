import { isVerified, shouldHide, tally } from './trust';

const confirm = (o: Partial<{ byStudent: boolean; byAdmin: boolean }> = {}) => ({
  kind: 'confirm',
  byStudent: false,
  byAdmin: false,
  ...o,
});
const report = () => ({ kind: 'report', byStudent: false, byAdmin: false });

describe('tally', () => {
  it('counts confirmations and reports separately', () => {
    expect(tally([confirm(), confirm(), report()])).toEqual({
      confirmCount: 2,
      reportCount: 1,
      trustScore: 0,
    });
  });

  it('scores a verified student at 1 and an admin at 2', () => {
    expect(tally([confirm({ byStudent: true })]).trustScore).toBe(1);
    expect(tally([confirm({ byAdmin: true })]).trustScore).toBe(2);
  });

  it('scores an admin once, not three times, when both flags are set', () => {
    expect(tally([confirm({ byStudent: true, byAdmin: true })]).trustScore).toBe(2);
  });

  it('counts an ordinary confirmation but scores it zero', () => {
    const t = tally([confirm(), confirm(), confirm()]);
    expect(t.confirmCount).toBe(3);
    expect(t.trustScore).toBe(0);
    expect(isVerified(t)).toBe(false);
  });

  it('ignores a vote whose kind is neither confirm nor report', () => {
    expect(tally([{ kind: 'nonsense' }, {}, confirm()])).toEqual({
      confirmCount: 1,
      reportCount: 0,
      trustScore: 0,
    });
  });

  it('does not trust a non-boolean flag', () => {
    expect(tally([{ kind: 'confirm', byAdmin: 'true' }]).trustScore).toBe(0);
  });
});

describe('isVerified', () => {
  it('takes two students', () => {
    expect(isVerified(tally([confirm({ byStudent: true })]))).toBe(false);
    expect(
      isVerified(tally([confirm({ byStudent: true }), confirm({ byStudent: true })])),
    ).toBe(true);
  });

  it('takes only one admin — this is what bootstraps an empty campus', () => {
    expect(isVerified(tally([confirm({ byAdmin: true })]))).toBe(true);
  });

  it('cannot be reached by throwaway accounts alone', () => {
    const many = Array.from({ length: 20 }, () => confirm());
    expect(isVerified(tally(many))).toBe(false);
  });
});

describe('shouldHide', () => {
  it('needs three reports', () => {
    expect(shouldHide(tally([report(), report()]))).toBe(false);
    expect(shouldHide(tally([report(), report(), report()]))).toBe(true);
  });

  it('refuses to hide when confirmations match or outnumber the reports', () => {
    // A confusing entrance is not a fake one: three people who could not find it
    // against three who could must not delete a real restroom.
    const tied = [report(), report(), report(), confirm(), confirm(), confirm()];
    expect(shouldHide(tally(tied))).toBe(false);
  });

  it('hides once the reports pull ahead again', () => {
    const ahead = [report(), report(), report(), report(), confirm(), confirm(), confirm()];
    expect(shouldHide(tally(ahead))).toBe(true);
  });

  it('counts ordinary confirmations as a defence even though they score zero', () => {
    const t = tally([report(), report(), report(), confirm(), confirm(), confirm()]);
    expect(t.trustScore).toBe(0);
    expect(isVerified(t)).toBe(false);
    expect(shouldHide(t)).toBe(false);
  });
});
