import {
  restroomTransitions,
  reviewNotification,
  voteNotification,
} from './notifications';

const OWNER = 'owner1';
const OTHER = 'other1';

const review = (o: Record<string, unknown> = {}) => ({
  restroomId: 'r1',
  authorId: OTHER,
  rating: 4,
  ...o,
});

const vote = (o: Record<string, unknown> = {}) => ({
  restroomId: 'r1',
  voterId: OTHER,
  kind: 'confirm',
  ...o,
});

describe('reviewNotification', () => {
  it('tells the author when somebody else reviews their restroom', () => {
    expect(reviewNotification(undefined, review(), 'r1_other1', OWNER)).toEqual({
      id: 'rev_r1_other1',
      userId: OWNER,
      kind: 'review',
      actorId: OTHER,
      restroomId: 'r1',
      reviewId: 'r1_other1',
    });
  });

  /**
   * The rules bar voting on your own restroom but NOT reviewing it, so this
   * function is the only thing standing between an author and a notification
   * about themselves.
   */
  it('says nothing when the author reviews their own restroom', () => {
    expect(reviewNotification(undefined, review({ authorId: OWNER }), 'x', OWNER)).toBeNull();
  });

  // onDocumentWritten fires on all three. Only the create is news.
  it('says nothing on an edit', () => {
    expect(reviewNotification(review({ rating: 3 }), review({ rating: 5 }), 'x', OWNER)).toBeNull();
  });

  it('says nothing on a delete', () => {
    expect(reviewNotification(review(), undefined, 'x', OWNER)).toBeNull();
  });

  it('says nothing when the restroom has no owner to tell', () => {
    expect(reviewNotification(undefined, review(), 'x', null)).toBeNull();
  });

  it('ignores a malformed document rather than notifying "undefined"', () => {
    expect(reviewNotification(undefined, {}, 'x', OWNER)).toBeNull();
    expect(reviewNotification(undefined, review({ authorId: '' }), 'x', OWNER)).toBeNull();
    expect(reviewNotification(undefined, review({ restroomId: 42 }), 'x', OWNER)).toBeNull();
  });
});

describe('voteNotification', () => {
  it('tells the author when somebody confirms their restroom', () => {
    expect(voteNotification(undefined, vote(), 'r1_other1', OWNER)).toEqual({
      id: 'con_r1_other1',
      userId: OWNER,
      kind: 'confirmed',
      actorId: null,
      restroomId: 'r1',
      reviewId: null,
    });
  });

  /**
   * ⚠️ The privacy guarantee, as a test. restroomVotes reads are owner-scoped
   * precisely to stop retaliation; naming the voter here would route around
   * that rule entirely.
   */
  it('never names the voter', () => {
    const item = voteNotification(undefined, vote(), 'v1', OWNER);
    expect(item?.actorId).toBeNull();
    expect(JSON.stringify(item)).not.toContain(OTHER);
  });

  /**
   * Reports are deliberately silent. Three of them produce a `hidden`
   * notification via the restroom itself, which is the honest signal; one
   * notification per doubter is how you make someone stop contributing.
   */
  it('says nothing about a report', () => {
    expect(voteNotification(undefined, vote({ kind: 'report' }), 'v1', OWNER)).toBeNull();
  });

  it('says nothing when a vote is withdrawn', () => {
    expect(voteNotification(vote(), undefined, 'v1', OWNER)).toBeNull();
  });
});

describe('restroomTransitions', () => {
  const at = { seconds: 1, nanoseconds: 0 };

  it('announces the moment a restroom becomes verified', () => {
    const out = restroomTransitions(
      { createdBy: OWNER, verified: false, hiddenAt: null },
      { createdBy: OWNER, verified: true, hiddenAt: null },
      'r1',
    );
    expect(out).toEqual([
      { id: 'ver_r1', userId: OWNER, kind: 'verified', actorId: null, restroomId: 'r1', reviewId: null },
    ]);
  });

  /**
   * ⚠️ The regression this is really for. onRestroomWritten fires on EVERY
   * write — a rating recompute, a photo, a pending-count cascade — so a check
   * on `after.verified === true` alone would resend this forever.
   */
  it('does not re-announce a restroom that was already verified', () => {
    const doc = { createdBy: OWNER, verified: true, hiddenAt: null };
    expect(restroomTransitions(doc, { ...doc, ratingCount: 3 }, 'r1')).toEqual([]);
  });

  it('warns when reports hide a restroom', () => {
    const out = restroomTransitions(
      { createdBy: OWNER, verified: false, hiddenAt: null },
      { createdBy: OWNER, verified: false, hiddenAt: at },
      'r1',
    );
    expect(out.map((n) => n.kind)).toEqual(['hidden']);
  });

  // Confirmations arriving in the grace week clear hiddenAt. Coming back is
  // not something to warn about.
  it('says nothing when a hidden restroom recovers', () => {
    const out = restroomTransitions(
      { createdBy: OWNER, verified: false, hiddenAt: at },
      { createdBy: OWNER, verified: false, hiddenAt: null },
      'r1',
    );
    expect(out).toEqual([]);
  });

  it('says nothing on a create or a delete', () => {
    expect(restroomTransitions(undefined, { createdBy: OWNER, verified: true }, 'r1')).toEqual([]);
    expect(restroomTransitions({ createdBy: OWNER, verified: false }, undefined, 'r1')).toEqual([]);
  });

  it('never names an actor', () => {
    const out = restroomTransitions(
      { createdBy: OWNER, verified: false, hiddenAt: null },
      { createdBy: OWNER, verified: true, hiddenAt: at },
      'r1',
    );
    expect(out).toHaveLength(2);
    expect(out.every((n) => n.actorId === null)).toBe(true);
  });
});
