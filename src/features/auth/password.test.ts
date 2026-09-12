import { MIN_PASSWORD_LENGTH, scorePassword } from './password';

describe('scorePassword', () => {
  it('fails the minimum below the length floor, whatever the mix', () => {
    const score = scorePassword('aB3$x');
    expect(score.meetsMinimum).toBe(false);
    expect(score.strength).toBe('weak');
  });

  it('accepts exactly the minimum length', () => {
    expect(scorePassword('a'.repeat(MIN_PASSWORD_LENGTH)).meetsMinimum).toBe(true);
  });

  it('is weak when long enough but single-class', () => {
    const score = scorePassword('aaaaaaaaaaaaaaa');
    expect(score.meetsMinimum).toBe(true);
    expect(score.strength).toBe('weak');
    expect(score.filled).toBe(1);
  });

  it('is fair with two character classes at the floor', () => {
    const score = scorePassword('abcd1234');
    expect(score.strength).toBe('fair');
    expect(score.filled).toBe(2);
  });

  it('needs both length and variety to be strong', () => {
    expect(scorePassword('abcd1234EFGH').strength).toBe('strong');
    // Same variety, one character short of the length bar.
    expect(scorePassword('abcd1234EFG').strength).toBe('fair');
  });

  it('shows an empty meter for an empty field', () => {
    expect(scorePassword('')).toEqual({ strength: 'weak', meetsMinimum: false, filled: 0 });
  });
});
