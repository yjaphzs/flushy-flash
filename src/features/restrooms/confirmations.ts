/**
 * How a restroom's community votes are described in public.
 *
 * ## ⚠️ Counts, never progress toward a threshold
 *
 * The obvious thing to write on "Your restrooms" is "1 of 2 confirmations", and
 * it would be wrong. `VERIFY_SCORE = 2` is a threshold on **`trustScore`**, not
 * on `confirmCount`: `trustScore` is `2 × admin + 1 × verified student`, so a
 * confirmation from an ordinary account increments `confirmCount` and scores
 * **zero**. Three such confirmations would render "3 of 2" on a restroom that
 * is still, correctly, unverified.
 *
 * `confirmCount > trustScore` is the normal case, not a bug — and `trustScore`
 * is deliberately never shown, because "your friend confirmed it but it did not
 * count" is both awkward to explain and an invitation to game. See AGENTS.md
 * §"The trust system".
 *
 * So these are plain counts, which are true whoever cast them.
 *
 * This lived inline in `trust-row.tsx` until the list row needed the same
 * words. Two surfaces describing one thing is how they drift — the same reason
 * `restroom-row.tsx` and `restroom-detail.tsx` exist.
 */

/** "Nobody has confirmed it yet" / "1 person found this" / "4 people found this". */
export function confirmationSummary(confirmCount: number): string {
  if (confirmCount <= 0) return 'Nobody has confirmed it yet';
  return confirmCount === 1 ? '1 person found this' : `${confirmCount} people found this`;
}

/**
 * "1 report" / "3 reports", or null when there are none.
 *
 * Null rather than "0 reports" for the reason `ScoreBar` already establishes:
 * an empty scale reads as a score of zero rather than as nobody having spoken.
 */
export function reportSummary(reportCount: number): string | null {
  if (reportCount <= 0) return null;
  return reportCount === 1 ? '1 report' : `${reportCount} reports`;
}
