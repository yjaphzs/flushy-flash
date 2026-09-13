import { countPending, PENDING_CAP } from '@/features/restrooms/pending-quota';
import type { Restroom } from '@/lib/types';

const at = (createdBy: string, verified: boolean) => ({ createdBy, verified }) as Restroom;

describe('countPending', () => {
  it('counts only this user, and only the unverified', () => {
    const all = [
      at('alice', false),
      at('alice', false),
      at('alice', true),
      at('bob', false),
    ];
    expect(countPending(all, 'alice')).toBe(2);
    expect(countPending(all, 'bob')).toBe(1);
  });

  it('is zero for a guest rather than counting everything', () => {
    expect(countPending([at('alice', false)], null)).toBe(0);
  });

  /**
   * The point of the whole scheme: verifying an entry gives the slot back, so a
   * good contributor is never blocked and a spammer stalls at the cap because
   * nobody confirms their junk.
   */
  it('frees a slot when a restroom is verified', () => {
    const pending = Array.from({ length: PENDING_CAP }, () => at('alice', false));
    expect(countPending(pending, 'alice')).toBe(PENDING_CAP);

    const oneVerified = [at('alice', true), ...pending.slice(1)];
    expect(countPending(oneVerified, 'alice')).toBe(PENDING_CAP - 1);
  });

  it('does not count another account toward your cap', () => {
    const theirs = Array.from({ length: 10 }, () => at('bob', false));
    expect(countPending(theirs, 'alice')).toBe(0);
  });
});
