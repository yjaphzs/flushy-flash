/**
 * Password strength, scored locally.
 *
 * Deliberately not zxcvbn: ~800KB of dictionary shipped in the bundle to grade a
 * signup field is a bad trade on a campus app that students install over mobile
 * data. This is a legibility hint, not a security control — the real floor is
 * `MIN_LENGTH` plus Firebase's own policy.
 */
export type PasswordStrength = 'weak' | 'fair' | 'strong';

/** Firebase rejects under 6; 8 is the floor worth asking for. */
export const MIN_PASSWORD_LENGTH = 8;

export type PasswordScore = {
  strength: PasswordStrength;
  meetsMinimum: boolean;
  /** 0–3, for the meter. */
  filled: number;
};

function classesUsed(password: string): number {
  return [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length;
}

export function scorePassword(password: string): PasswordScore {
  const meetsMinimum = password.length >= MIN_PASSWORD_LENGTH;
  if (!meetsMinimum) return { strength: 'weak', meetsMinimum, filled: password.length > 0 ? 1 : 0 };

  const classes = classesUsed(password);
  if (password.length >= 12 && classes >= 3) return { strength: 'strong', meetsMinimum, filled: 3 };
  if (classes >= 2) return { strength: 'fair', meetsMinimum, filled: 2 };
  return { strength: 'weak', meetsMinimum, filled: 1 };
}

export const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  weak: 'Weak',
  fair: 'Fair',
  strong: 'Strong',
};
