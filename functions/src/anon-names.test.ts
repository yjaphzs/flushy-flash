import { ANON_NAMES, anonName } from './anon-names';

describe('anonName', () => {
  /**
   * The reason this hashes instead of calling Math.random(). A re-run of the
   * purge, or any later code that renders a name without reading the tombstone,
   * must agree with what was already stored.
   */
  it('is deterministic for the same id', () => {
    for (const id of ['anon_abc123', 'anon_ZZZ', 'x']) {
      expect(anonName(id)).toBe(anonName(id));
    }
  });

  it('always returns a name from the list', () => {
    for (let i = 0; i < 500; i++) {
      expect(ANON_NAMES).toContain(anonName(`anon_${i}`));
    }
  });

  it('gives different ids different names, most of the time', () => {
    const seen = new Set(Array.from({ length: 200 }, (_, i) => anonName(`anon_${i}`)));
    // Two deleted users landing on the same name is truthful — they ARE
    // different people and their reviews are genuinely distinct documents — but
    // a hash that collapsed everything onto one label would read as a bug.
    expect(seen.size).toBeGreaterThan(ANON_NAMES.length / 2);
  });

  it('handles an empty id without throwing', () => {
    expect(ANON_NAMES).toContain(anonName(''));
  });

  /** Each of these collides with real vocabulary elsewhere in the app. */
  it('avoids names that collide with app state', () => {
    const banned = ['Out of Order', 'Closed', 'Vacant', 'Occupied'];
    for (const name of ANON_NAMES) expect(banned).not.toContain(name);
  });

  it('has enough names that a same-restroom collision is unlikely', () => {
    expect(ANON_NAMES.length).toBeGreaterThanOrEqual(15);
  });
});
