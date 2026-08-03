import { describe, expect, it } from 'vitest';
import { beatBoss, createRandomizedStart, createTestGameService, setupPartyFromOptions } from '../src/AutoBattle.js';

describe('AutoBattle', () => {
  it('beats the first boss with 3 randomized heroes', () => {
    const seed = 42;
    const service = createTestGameService();
    const options = createRandomizedStart(seed);
    setupPartyFromOptions(service, options);

    const view = service.getView();
    expect(view?.party).toHaveLength(3);

    const result = beatBoss(service, 3000);
    expect(result?.phase).toBe('ActComplete');
    expect(result?.party).toHaveLength(3);
  }, 30_000);

  it('covers different hero combinations across seeds', () => {
    const combos = new Set<string>();
    for (let seed = 1; seed <= 10; seed++) {
      const options = createRandomizedStart(seed);
      combos.add([options.startingHeroId, ...options.recruitHeroIds].sort().join(','));
    }
    expect(combos.size).toBeGreaterThan(1);
  });
});
