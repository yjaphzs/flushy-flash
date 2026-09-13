import { confirmationSummary, reportSummary } from '@/features/restrooms/confirmations';

describe('confirmationSummary', () => {
  it.each([
    [0, 'Nobody has confirmed it yet'],
    [1, '1 person found this'],
    [2, '2 people found this'],
    [11, '11 people found this'],
  ])('describes %d confirmations', (count, expected) => {
    expect(confirmationSummary(count)).toBe(expected);
  });

  /**
   * The counter is maintained by a Cloud Function, and a backfill or a deletion
   * race can leave it behind reality for a moment. Reading below zero must say
   * "nobody", never "-1 people found this".
   */
  it('treats a negative count as nobody', () => {
    expect(confirmationSummary(-1)).toBe('Nobody has confirmed it yet');
  });

  /**
   * ⚠️ The regression guard. `VERIFY_SCORE = 2` is a threshold on `trustScore`
   * (2 × admin + 1 × verified student), NOT on `confirmCount` — an ordinary
   * account's confirmation counts here and scores zero. So three confirmations
   * on a still-unverified restroom is the normal case, and this must never
   * start rendering progress toward 2.
   */
  it('never renders a threshold, however many confirmations there are', () => {
    for (const count of [2, 3, 9]) {
      expect(confirmationSummary(count)).not.toMatch(/of 2|\/ ?2/);
    }
  });
});

describe('reportSummary', () => {
  it.each([
    [1, '1 report'],
    [4, '4 reports'],
  ])('describes %d reports', (count, expected) => {
    expect(reportSummary(count)).toBe(expected);
  });

  // Null, not "0 reports": an empty scale reads as a score rather than silence.
  it.each([0, -2])('returns null for %d', (count) => {
    expect(reportSummary(count)).toBeNull();
  });
});
