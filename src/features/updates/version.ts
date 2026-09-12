/**
 * Version comparison for the in-app updater.
 *
 * Deliberately NOT a semver dependency. Every version this ever compares is
 * produced by one place — `release.yml` derives it from the git tag by stripping
 * a leading `v` — so the input space is `MAJOR.MINOR.PATCH` and nothing else.
 * A parser that also understands pre-release tags and build metadata would be
 * answering questions this app never asks.
 *
 * It still has to be TOTAL rather than trusting that shape, because one of the
 * two inputs comes off the network.
 */

/** `1.0.2` → `[1, 0, 2]`. Missing or junk segments read as 0. */
function parts(v: string): [number, number, number] {
  const n = v
    .trim()
    .replace(/^v/, '')
    // Drop anything after the patch number: `1.2.3-beta.1` compares as 1.2.3.
    // Ordering pre-releases correctly is a real problem, and shipping one is a
    // decision this project has not made.
    .split('.')
    .slice(0, 3)
    .map((x) => Number.parseInt(x, 10));

  return [n[0] || 0, n[1] || 0, n[2] || 0];
}

/** `-1` if a < b, `0` if equal, `1` if a > b. */
export function compareVersions(a: string, b: string): number {
  const [aMaj, aMin, aPat] = parts(a);
  const [bMaj, bMin, bPat] = parts(b);
  if (aMaj !== bMaj) return aMaj < bMaj ? -1 : 1;
  if (aMin !== bMin) return aMin < bMin ? -1 : 1;
  if (aPat !== bPat) return aPat < bPat ? -1 : 1;
  return 0;
}

/**
 * Whether `candidate` is worth offering over `installed`.
 *
 * Strictly greater, never merely different. A dev build can legitimately run
 * AHEAD of the latest tag — that is the normal state of this repo between
 * releases — and offering to "update" someone onto an older APK would be an
 * unprompted downgrade that Android then refuses to install anyway.
 */
export function isNewer(candidate: string, installed: string): boolean {
  return compareVersions(candidate, installed) > 0;
}
