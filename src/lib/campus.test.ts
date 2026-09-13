import { CLSU_EMAIL_DOMAINS, CLSU_PRIMARY_DOMAIN, isCampusEmail } from '@/lib/campus';

/**
 * ⚠️ These mirror `isVerifiedStudent()` in firestore.rules, which is the
 * authority and whose regex is `^[^@]+@clsu2?[.]edu[.]ph$`. A disagreement
 * between the two is not a wrong badge — it is a permission-denied on profile
 * creation. `rules/firestore.test.ts` asserts the same cases server-side.
 */
describe('isCampusEmail', () => {
  it('accepts both campus domains', () => {
    expect(isCampusEmail('juan@clsu.edu.ph')).toBe(true);
    expect(isCampusEmail('juan@clsu2.edu.ph')).toBe(true);
  });

  it('is case-insensitive, because the rules lower() before matching', () => {
    expect(isCampusEmail('Juan@CLSU.EDU.PH')).toBe(true);
    expect(isCampusEmail('JUAN@Clsu2.Edu.Ph')).toBe(true);
  });

  it('rejects an outside address', () => {
    expect(isCampusEmail('juan@gmail.com')).toBe(false);
  });

  it('rejects near misses that a naive contains() would accept', () => {
    // The regex is anchored at both ends; these are what that buys.
    expect(isCampusEmail('juan@clsu3.edu.ph')).toBe(false);
    expect(isCampusEmail('juan@notclsu.edu.ph')).toBe(false);
    expect(isCampusEmail('juan@clsu.edu.ph.evil.com')).toBe(false);
    expect(isCampusEmail('juan@sub.clsu.edu.ph')).toBe(false);
    // The dots must be ESCAPED when the pattern is built from the list. An
    // unescaped `.` matches any character, so this would pass.
    expect(isCampusEmail('juan@clsuXedu.ph')).toBe(false);
    expect(isCampusEmail('juan@clsu2Xedu.ph')).toBe(false);
  });

  it('rejects the bare domain with no local part', () => {
    expect(isCampusEmail('@clsu.edu.ph')).toBe(false);
  });

  it('handles null and empty rather than throwing', () => {
    expect(isCampusEmail(null)).toBe(false);
    expect(isCampusEmail(undefined)).toBe(false);
    expect(isCampusEmail('')).toBe(false);
  });

  it('keeps the primary domain first, which is what placeholders show', () => {
    expect(CLSU_PRIMARY_DOMAIN).toBe('clsu.edu.ph');
    expect(CLSU_EMAIL_DOMAINS[0]).toBe(CLSU_PRIMARY_DOMAIN);
  });
});
