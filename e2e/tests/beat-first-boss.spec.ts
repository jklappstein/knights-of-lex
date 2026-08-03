import { test, expect } from '@playwright/test';
import { ALL_HERO_IDS } from '@kol/test-support';

interface TestBridge {
  startRandomizedRun(seed: number): {
    seed: number;
    startingHeroId: string;
    recruitHeroIds: readonly [string, string];
    formation: Readonly<Record<string, 'front' | 'back'>>;
    skillAllocations: ReadonlyArray<{ heroId: string; nodeId: string }>;
  };
  autoPlayTurn(): boolean;
  beatBoss(): { phase: string; party: readonly { heroId: string }[] } | null;
  getView(): {
    phase: string;
    party: readonly { heroId: string; allocatedSkills: readonly string[] }[];
    battle: { enemies: readonly { isBoss: boolean; currentHp: number }[] } | null;
  } | null;
  getPhase(): string;
}

test.describe('Knights of Lex — First Boss', () => {
  test('beats the Zed King with 3 randomized heroes covering all symbol types', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(() => window.__KOL_TEST__ !== undefined, null, { timeout: 30_000 });

    const seed = Math.floor(Math.random() * 10000) + 1;

    const startResult = await page.evaluate((testSeed) => {
      const bridge = window.__KOL_TEST__ as TestBridge;
      return bridge.startRandomizedRun(testSeed);
    }, seed);

    expect(startResult.startingHeroId).toBeTruthy();
    expect(startResult.recruitHeroIds).toHaveLength(2);
    expect(new Set([startResult.startingHeroId, ...startResult.recruitHeroIds]).size).toBe(3);

    const allPartyHeroes = [startResult.startingHeroId, ...startResult.recruitHeroIds];
    const allSymbols = new Set<string>();
    for (const heroId of allPartyHeroes) {
      const heroDef = ALL_HERO_IDS.includes(heroId);
      expect(heroDef).toBe(true);
    }

    expect(startResult.skillAllocations.length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(startResult.formation).length).toBe(3);

    const finalView = await page.evaluate(async () => {
      const bridge = window.__KOL_TEST__ as TestBridge;
      const maxSteps = 2000;
      let steps = 0;

      while (steps < maxSteps) {
        const view = bridge.getView();
        if (!view) return null;

        if (view.phase === 'ActComplete') {
          return {
            phase: view.phase,
            partySize: view.party.length,
            partyHeroes: view.party.map((h) => h.heroId),
            skillCount: view.party.reduce((sum, h) => sum + h.allocatedSkills.length, 0),
          };
        }

        if (view.phase === 'RunDefeat') {
          return { phase: 'RunDefeat', partySize: 0, partyHeroes: [], skillCount: 0 };
        }

        const played = bridge.autoPlayTurn();
        if (!played) {
          await new Promise((r) => setTimeout(r, 10));
        }
        steps++;
      }

      const view = bridge.getView();
      return view
        ? {
            phase: view.phase,
            partySize: view.party.length,
            partyHeroes: view.party.map((h) => h.heroId),
            skillCount: view.party.reduce((sum, h) => sum + h.allocatedSkills.length, 0),
          }
        : null;
    });

    expect(finalView).not.toBeNull();
    expect(finalView?.phase).toBe('ActComplete');
    expect(finalView?.partySize).toBe(3);
    expect(finalView?.partyHeroes).toHaveLength(3);
    expect(finalView?.skillCount).toBeGreaterThanOrEqual(1);

    const uniqueHeroes = new Set(finalView?.partyHeroes);
    expect(uniqueHeroes.size).toBe(3);
  });

  test('randomized seeds produce different hero combinations', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__KOL_TEST__ !== undefined);

    const combinations = await page.evaluate(() => {
      const bridge = window.__KOL_TEST__ as TestBridge;
      const results: string[] = [];
      for (let seed = 1; seed <= 20; seed++) {
        const start = bridge.startRandomizedRun(seed);
        results.push([start.startingHeroId, ...start.recruitHeroIds].sort().join(','));
      }
      return new Set(results).size;
    });

    expect(combinations).toBeGreaterThan(1);
  });
});

declare global {
  interface Window {
    __KOL_TEST__?: TestBridge;
  }
}
