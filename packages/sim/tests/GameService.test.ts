import { describe, expect, it } from 'vitest';
import { BUNDLED_CONTENT } from '@kol/content-runtime';
import { createLexiconRuntime, DEFAULT_SEMANTIC_AFFINITIES, DEFAULT_WORDS } from '@kol/lexicon-runtime';
import { GameService } from '../src/GameService.js';

const lexicon = createLexiconRuntime(DEFAULT_WORDS, DEFAULT_SEMANTIC_AFFINITIES);

function createService(): GameService {
  return new GameService({ catalog: BUNDLED_CONTENT, lexicon });
}

describe('GameService', () => {
  it('creates a run and chooses starting hero', () => {
    const service = createService();
    const create = service.dispatch({ type: 'CreateRun', seed: 42, expectedRevision: 0 });
    expect(create.result.ok).toBe(true);

    const choose = service.dispatch({
      type: 'ChooseStartingHero',
      heroId: 'hero.vanguard',
      expectedRevision: 1,
    });
    expect(choose.result.ok).toBe(true);
    expect(choose.facts[0]?.type).toBe('StartingHeroChosen');
  });

  it('rejects stale revision', () => {
    const service = createService();
    service.dispatch({ type: 'CreateRun', seed: 42, expectedRevision: 0 });
    const result = service.dispatch({
      type: 'ChooseStartingHero',
      heroId: 'hero.vanguard',
      expectedRevision: 99,
    });
    expect(result.result.ok).toBe(false);
    if (!result.result.ok) {
      expect(result.result.code).toBe('STALE_REVISION');
    }
  });

  it('recruits heroes up to party cap of 3', () => {
    const service = createService();
    service.dispatch({ type: 'CreateRun', seed: 42, expectedRevision: 0 });
    service.dispatch({ type: 'ChooseStartingHero', heroId: 'hero.vanguard', expectedRevision: 1 });
    service.dispatch({ type: 'RecruitHero', heroId: 'hero.ranger', expectedRevision: 2 });
    const recruit = service.dispatch({ type: 'RecruitHero', heroId: 'hero.cleric', expectedRevision: 3 });
    expect(recruit.result.ok).toBe(true);

    const full = service.dispatch({ type: 'RecruitHero', heroId: 'hero.paladin', expectedRevision: 4 });
    expect(full.result.ok).toBe(false);
  });
});
