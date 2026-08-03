import type { RunView } from '@kol/shared-types';
import { ALL_HERO_IDS, BUNDLED_CONTENT } from '@kol/content-runtime';
import { createLexiconRuntime, DEFAULT_SEMANTIC_AFFINITIES, DEFAULT_WORDS } from '@kol/lexicon-runtime';
import {
  GameService,
  getAllSkillNodesForHero,
  getEncounterSequence,
  getRecruitableHeroes,
} from '@kol/sim';

const lexicon = createLexiconRuntime(DEFAULT_WORDS, DEFAULT_SEMANTIC_AFFINITIES);

export interface RandomizedStartOptions {
  readonly seed: number;
  readonly startingHeroId: string;
  readonly recruitHeroIds: readonly [string, string];
  readonly formation: Readonly<Record<string, 'front' | 'back'>>;
  readonly skillAllocations: ReadonlyArray<{ heroId: string; nodeId: string }>;
}

export function createRandomizedStart(seed: number): RandomizedStartOptions {
  const rng = new GameService({ catalog: BUNDLED_CONTENT, lexicon });
  rng.dispatch({ type: 'CreateRun', seed, expectedRevision: 0 });

  const heroIndex = seed % ALL_HERO_IDS.length;
  const startingHeroId = ALL_HERO_IDS[heroIndex] ?? 'hero.vanguard';

  const remaining = ALL_HERO_IDS.filter((id) => id !== startingHeroId);
  const recruit1 = remaining[(seed + 3) % remaining.length] ?? 'hero.ranger';
  const recruit2 = remaining.filter((id) => id !== recruit1)[(seed + 7) % (remaining.length - 1)] ?? 'hero.cleric';

  const formation: Record<string, 'front' | 'back'> = {};
  formation[startingHeroId] = 'front';
  formation[recruit1] = seed % 2 === 0 ? 'front' : 'back';
  formation[recruit2] = seed % 3 === 0 ? 'front' : 'back';

  const skillAllocations: { heroId: string; nodeId: string }[] = [];
  for (const heroId of [startingHeroId, recruit1, recruit2]) {
    const nodes = getAllSkillNodesForHero(BUNDLED_CONTENT, heroId);
    const node = nodes[seed % Math.max(nodes.length, 1)];
    if (node) {
      skillAllocations.push({ heroId, nodeId: node });
    }
  }

  return {
    seed,
    startingHeroId,
    recruitHeroIds: [recruit1, recruit2],
    formation,
    skillAllocations,
  };
}

export function setupPartyFromOptions(service: GameService, options: RandomizedStartOptions): void {
  let revision = 0;
  service.dispatch({ type: 'CreateRun', seed: options.seed, expectedRevision: revision });
  revision = service.getView()?.revision ?? 1;

  service.dispatch({
    type: 'ChooseStartingHero',
    heroId: options.startingHeroId,
    expectedRevision: revision,
  });
  revision = service.getView()?.revision ?? revision + 1;

  for (const heroId of options.recruitHeroIds) {
    service.dispatch({ type: 'RecruitHero', heroId, expectedRevision: revision });
    revision = service.getView()?.revision ?? revision + 1;
  }

  for (const alloc of options.skillAllocations) {
    service.dispatch({
      type: 'AllocateSkillPoint',
      heroId: alloc.heroId,
      nodeId: alloc.nodeId,
      expectedRevision: revision,
    });
    revision = service.getView()?.revision ?? revision + 1;
  }

  service.dispatch({ type: 'SetFormation', assignments: options.formation, expectedRevision: revision });
}

export function findBestWord(service: GameService): { heroId: string; path: readonly { q: number; r: number }[]; boardRevision: number } | null {
  const view = service.getView();
  if (!view?.battle) return null;

  const currentActorId = view.battle.currentActorId;
  const hero = view.battle.heroes.find((h) => h.unitId === currentActorId);
  if (!hero) return null;

  const board = view.battle.boards.find((b) => b.heroId === hero.heroId);
  if (!board) return null;

  const words = lexicon.findWordsOnBoard(
    board.tiles.map((t) => ({ coord: t.coord, letter: t.letter, combatSymbol: t.combatSymbol })),
    3,
    new Set(view.battle.usedWords),
  );

  const best = words[0];
  if (!best) return null;

  return { heroId: hero.heroId, path: best.path, boardRevision: board.revision };
}

export function autoPlayTurn(service: GameService): boolean {
  const view = service.getView();
  if (!view) return false;
  const revision = view.revision;

  if (view.battle?.phase === 'HeroTurnAwaitingWord') {
    const word = findBestWord(service);
    if (!word) return false;
    const result = service.dispatch({
      type: 'SubmitWord',
      heroId: word.heroId,
      path: word.path,
      boardRevision: word.boardRevision,
      expectedRevision: revision,
    });
    return result.result.ok;
  }

  if (view.battle?.phase === 'EnemyTurnReady') {
    const result = service.dispatch({ type: 'ResolveEnemyTurn', expectedRevision: revision });
    return result.result.ok;
  }

  if (view.phase === 'Intermission') {
    service.dispatch({ type: 'LeaveIntermission', expectedRevision: revision });
    return true;
  }

  if (view.phase === 'Encounter' && !view.battle) {
    service.dispatch({ type: 'StartEncounter', expectedRevision: revision });
    return true;
  }

  return false;
}

export function autoPlayUntilBoss(service: GameService, maxSteps = 500): RunView | null {
  let steps = 0;
  while (steps < maxSteps) {
    const view = service.getView();
    if (!view) return null;

    if (view.phase === 'ActComplete') return view;

    const encounterSeq = getEncounterSequence(BUNDLED_CONTENT, view.actIndex);
    const bossId = encounterSeq[encounterSeq.length - 1];
    const inBossFight = view.battle && view.battle.enemies.some((e) => e.isBoss);

    if (inBossFight) return view;

    if (!autoPlayTurn(service)) {
      steps++;
      continue;
    }
    steps++;
  }
  return service.getView();
}

export function beatBoss(service: GameService, maxSteps = 1000): RunView | null {
  let steps = 0;
  while (steps < maxSteps) {
    const view = service.getView();
    if (!view) return null;
    if (view.phase === 'ActComplete') return view;
    if (view.phase === 'RunDefeat') return view;

    if (!autoPlayTurn(service)) {
      steps++;
      continue;
    }
    steps++;
  }
  return service.getView();
}

export function createTestGameService(): GameService {
  return new GameService({ catalog: BUNDLED_CONTENT, lexicon });
}

export { ALL_HERO_IDS, getRecruitableHeroes, getEncounterSequence };
