import type {
  BattlePhase,
  BattleView,
  BoardView,
  FoundationalSymbol,
  GameFact,
  HeroSnapshot,
  RunView,
} from '@kol/shared-types';
import type { GameContentCatalog } from '@kol/content-runtime';
import type { LexiconRuntime } from '@kol/lexicon-runtime';
import type { BoardTile } from '../board/HexBoard.js';
import { generateBoard, refillTiles } from '../board/HexBoard.js';
import type { CombatUnit } from '../combat/EffectExecutor.js';
import { executeEffects, executeEnemyAttack } from '../combat/EffectExecutor.js';
import { evaluateWord } from '../word/WordEvaluator.js';
import { RngStreamRegistry } from '../rng/StrictRng.js';

export interface HeroRuntimeState {
  heroId: string;
  unitId: string;
  level: number;
  xp: number;
  maxHp: number;
  currentHp: number;
  shield: number;
  formationRank: 'front' | 'back';
  symbols: readonly FoundationalSymbol[];
  abilityId: string;
  triadRecipeId: string;
  allocatedSkills: string[];
  isDowned: boolean;
  skillModifiers: Record<string, number>;
  board: BoardTile[];
  boardRevision: number;
}

export interface BattleRuntimeState {
  encounterId: string;
  phase: BattlePhase;
  initiativeOrder: string[];
  currentActorIndex: number;
  heroes: HeroRuntimeState[];
  enemies: CombatUnit[];
  usedWords: Set<string>;
  refillCounter: number;
}

export interface RunRuntimeState {
  seed: number;
  revision: number;
  phase: RunView['phase'];
  actIndex: number;
  encounterIndex: number;
  gold: number;
  party: HeroRuntimeState[];
  battle: BattleRuntimeState | null;
  contentHash: string;
  rng: RngStreamRegistry;
}

function toHeroSnapshot(hero: HeroRuntimeState): HeroSnapshot {
  return {
    heroId: hero.heroId,
    unitId: hero.unitId,
    level: hero.level,
    xp: hero.xp,
    maxHp: hero.maxHp,
    currentHp: hero.currentHp,
    shield: hero.shield,
    formationRank: hero.formationRank,
    symbols: hero.symbols,
    abilityId: hero.abilityId,
    allocatedSkills: hero.allocatedSkills,
    isDowned: hero.isDowned,
  };
}

function toBoardView(hero: HeroRuntimeState): BoardView {
  return {
    heroId: hero.heroId,
    revision: hero.boardRevision,
    tiles: hero.board.map((t) => ({
      coord: t.coord,
      letter: t.letter,
      combatSymbol: t.combatSymbol,
      revision: t.revision,
    })),
  };
}

export function projectRunView(state: RunRuntimeState): RunView {
  const battle: BattleView | null = state.battle
    ? {
        phase: state.battle.phase,
        initiativeOrder: state.battle.initiativeOrder,
        currentActorId: state.battle.initiativeOrder[state.battle.currentActorIndex] ?? null,
        heroes: state.battle.heroes.map(toHeroSnapshot),
        enemies: state.battle.enemies.map((e) => ({
          enemyId: e.enemyId ?? e.unitId,
          unitId: e.unitId,
          displayName: e.displayName,
          maxHp: e.maxHp,
          currentHp: e.currentHp,
          shield: e.shield,
          formationRank: e.formationRank,
          isBoss: e.isBoss,
          intentLabel: e.isBoss ? 'Mutate Letter' : 'Attack',
        })),
        boards: state.battle.heroes.map(toBoardView),
        usedWords: [...state.battle.usedWords],
        revision: state.revision,
      }
    : null;

  return {
    seed: state.seed,
    phase: state.phase,
    actIndex: state.actIndex,
    encounterIndex: state.encounterIndex,
    gold: state.gold,
    party: state.party.map(toHeroSnapshot),
    battle,
    revision: state.revision,
    contentHash: state.contentHash,
  };
}

export function createHeroState(
  catalog: GameContentCatalog,
  heroId: string,
  unitId: string,
  formationRank: 'front' | 'back',
  rng: RngStreamRegistry,
): HeroRuntimeState {
  const def = catalog.heroes.get(heroId);
  if (!def) throw new Error(`Unknown hero: ${heroId}`);

  const boardRng = rng.getStream(`board.initial.${heroId}`);
  const board = [...generateBoard(heroId, def.symbols, boardRng)];

  return {
    heroId,
    unitId,
    level: 1,
    xp: 0,
    maxHp: def.maxHp,
    currentHp: def.maxHp,
    shield: 0,
    formationRank,
    symbols: def.symbols,
    abilityId: def.abilityId,
    triadRecipeId: def.triadRecipeId,
    allocatedSkills: [],
    isDowned: false,
    skillModifiers: {},
    board,
    boardRevision: 0,
  };
}

export function startBattle(
  state: RunRuntimeState,
  catalog: GameContentCatalog,
  encounterId: string,
): { state: RunRuntimeState; facts: GameFact[] } {
  const encounter = catalog.encounters.get(encounterId);
  if (!encounter) throw new Error(`Unknown encounter: ${encounterId}`);

  const battleHeroes = state.party.map((h) => ({
    ...h,
    currentHp: h.maxHp,
    shield: 0,
    isDowned: false,
    board: [...generateBoard(h.heroId, h.symbols, state.rng.getStream(`board.initial.${h.heroId}`))],
    boardRevision: 0,
  }));

  const enemies: CombatUnit[] = encounter.enemies.map((enemyId, i) => {
    const def = catalog.enemies.get(enemyId);
    if (!def) throw new Error(`Unknown enemy: ${enemyId}`);
    return {
      unitId: `enemy-${i}`,
      isHero: false,
      enemyId,
      displayName: def.displayName,
      maxHp: def.maxHp,
      currentHp: def.maxHp,
      shield: 0,
      formationRank: def.formationPreference,
      isDowned: false,
      isBoss: def.isBoss ?? false,
    };
  });

  const initiativeRng = state.rng.getStream('battle.initiative');
  const allUnits: { id: string; initiative: number }[] = [
    ...battleHeroes.map((h) => {
      const def = catalog.heroes.get(h.heroId);
      return { id: h.unitId, initiative: (def?.initiative ?? 10) + initiativeRng.nextInt(1, 6) };
    }),
    ...enemies.map((e) => {
      const def = catalog.enemies.get(e.enemyId ?? '');
      return { id: e.unitId, initiative: (def?.initiative ?? 8) + initiativeRng.nextInt(1, 6) };
    }),
  ];

  allUnits.sort((a, b) => b.initiative - a.initiative);
  const initiativeOrder = allUnits.map((u) => u.id);

  const battle: BattleRuntimeState = {
    encounterId,
    phase: 'HeroTurnAwaitingWord',
    initiativeOrder,
    currentActorIndex: 0,
    heroes: battleHeroes,
    enemies,
    usedWords: new Set(),
    refillCounter: 0,
  };

  const facts: GameFact[] = [
    { type: 'BattleStarted', encounterId },
    { type: 'InitiativeOrderCommitted', order: initiativeOrder },
  ];

  const firstActor = initiativeOrder[0];
  const firstHero = battleHeroes.find((h) => h.unitId === firstActor);
  if (!firstHero) {
    battle.phase = 'EnemyTurnReady';
  }

  return {
    state: {
      ...state,
      revision: state.revision + 1,
      phase: 'Encounter',
      battle,
    },
    facts,
  };
}

export function submitWordInBattle(
  state: RunRuntimeState,
  catalog: GameContentCatalog,
  lexicon: LexiconRuntime,
  heroId: string,
  path: readonly import('@kol/shared-types').HexCoord[],
  boardRevision: number,
): { state: RunRuntimeState; facts: GameFact[]; rejected?: string } {
  const battle = state.battle;
  if (!battle) return { state, facts: [], rejected: 'NO_BATTLE' };

  const currentActorId = battle.initiativeOrder[battle.currentActorIndex];
  const hero = battle.heroes.find((h) => h.heroId === heroId);
  if (!hero) return { state, facts: [], rejected: 'HERO_NOT_FOUND' };
  if (hero.unitId !== currentActorId) return { state, facts: [], rejected: 'NOT_YOUR_TURN' };
  if (hero.isDowned) return { state, facts: [], rejected: 'HERO_DOWNED' };
  if (boardRevision !== hero.boardRevision) return { state, facts: [], rejected: 'STALE_REVISION' };

  const evaluation = evaluateWord(
    catalog,
    lexicon,
    hero.board,
    path,
    boardRevision,
    hero.symbols,
    hero.triadRecipeId,
    hero.skillModifiers,
    battle.usedWords,
  );

  if ('rejected' in evaluation) {
    return { state, facts: [], rejected: evaluation.code };
  }

  const heroUnits: CombatUnit[] = battle.heroes.map((h) => ({
    unitId: h.unitId,
    isHero: true,
    heroId: h.heroId,
    displayName: catalog.heroes.get(h.heroId)?.displayName ?? h.heroId,
    maxHp: h.maxHp,
    currentHp: h.currentHp,
    shield: h.shield,
    formationRank: h.formationRank,
    isDowned: h.isDowned,
    isBoss: false,
  }));

  const effectResult = executeEffects(
    evaluation.effectPlan,
    hero.unitId,
    heroUnits,
    battle.enemies,
  );

  battle.heroes = battle.heroes.map((h) => {
    const updated = heroUnits.find((u) => u.unitId === h.unitId);
    if (!updated) return h;
    return { ...h, currentHp: updated.currentHp, shield: updated.shield, isDowned: updated.isDowned };
  });

  battle.usedWords.add(evaluation.normalizedWord);

  const refillRng = state.rng.getStream(`board.refill.${heroId}`);
  hero.board = refillTiles(hero.board, path, hero.symbols, refillRng);
  hero.boardRevision += 1;
  battle.refillCounter += 1;

  const facts: GameFact[] = [
    {
      type: 'WordCommitted',
      heroId,
      normalizedWord: evaluation.normalizedWord,
      moveName: evaluation.moveName,
      evaluationDigest: evaluation.evaluationDigest,
    },
    ...effectResult.damageDealt.map((d: { sourceId: string; targetId: string; amount: number }) => ({
      type: 'DamageDealt' as const,
      sourceId: d.sourceId,
      targetId: d.targetId,
      amount: d.amount,
    })),
    ...effectResult.shieldGained.map((s: { targetId: string; amount: number }) => ({
      type: 'ShieldGained' as const,
      targetId: s.targetId,
      amount: s.amount,
    })),
    ...effectResult.healingApplied.map((h: { targetId: string; amount: number }) => ({
      type: 'HealingApplied' as const,
      targetId: h.targetId,
      amount: h.amount,
    })),
    {
      type: 'TilesRefilled',
      heroId,
      coords: path,
    },
  ];

  for (const h of battle.heroes) {
    if (h.isDowned) {
      facts.push({ type: 'HeroDowned', unitId: h.unitId });
    }
  }

  const allEnemiesDown = battle.enemies.every((e) => e.isDowned || e.currentHp <= 0);
  if (allEnemiesDown) {
    battle.phase = 'Victory';
    facts.push({ type: 'BattleWon' });
    return {
      state: { ...state, revision: state.revision + 1, battle },
      facts,
    };
  }

  advanceInitiative(battle);
  facts.push({
    type: 'TurnAdvanced',
    nextActorId: battle.initiativeOrder[battle.currentActorIndex] ?? null,
  });

  return {
    state: { ...state, revision: state.revision + 1, battle },
    facts,
  };
}

export function resolveEnemyTurn(
  state: RunRuntimeState,
): { state: RunRuntimeState; facts: GameFact[]; rejected?: string } {
  const battle = state.battle;
  if (!battle) return { state, facts: [], rejected: 'NO_BATTLE' };

  const currentActorId = battle.initiativeOrder[battle.currentActorIndex];
  const enemy = battle.enemies.find((e) => e.unitId === currentActorId);
  if (!enemy || enemy.isDowned) return { state, facts: [], rejected: 'NOT_ENEMY_TURN' };

  const facts: GameFact[] = [
    {
      type: 'EnemyIntentCommitted',
      enemyId: enemy.enemyId ?? enemy.unitId,
      intentLabel: enemy.isBoss ? 'Mutate Letter' : 'Attack',
    },
  ];

  const heroUnits: CombatUnit[] = battle.heroes.map((h) => ({
    unitId: h.unitId,
    isHero: true,
    heroId: h.heroId,
    displayName: h.heroId,
    maxHp: h.maxHp,
    currentHp: h.currentHp,
    shield: h.shield,
    formationRank: h.formationRank,
    isDowned: h.isDowned,
    isBoss: false,
  }));

  const effectResult = executeEnemyAttack(enemy, heroUnits);
  battle.heroes = battle.heroes.map((h) => {
    const updated = heroUnits.find((u) => u.unitId === h.unitId);
    if (!updated) return h;
    return { ...h, currentHp: updated.currentHp, shield: updated.shield, isDowned: updated.isDowned };
  });

  facts.push(
    ...effectResult.damageDealt.map((d: { sourceId: string; targetId: string; amount: number }) => ({
      type: 'DamageDealt' as const,
      sourceId: d.sourceId,
      targetId: d.targetId,
      amount: d.amount,
    })),
  );

  for (const h of battle.heroes) {
    if (h.isDowned) {
      facts.push({ type: 'HeroDowned', unitId: h.unitId });
    }
  }

  const allHeroesDown = battle.heroes.every((h) => h.isDowned);
  if (allHeroesDown) {
    battle.phase = 'Defeat';
    facts.push({ type: 'BattleLost' });
    return { state: { ...state, revision: state.revision + 1, battle }, facts };
  }

  advanceInitiative(battle);
  facts.push({
    type: 'TurnAdvanced',
    nextActorId: battle.initiativeOrder[battle.currentActorIndex] ?? null,
  });

  return { state: { ...state, revision: state.revision + 1, battle }, facts };
}

function advanceInitiative(battle: BattleRuntimeState): void {
  const livingOrder = battle.initiativeOrder.filter((id) => {
    const hero = battle.heroes.find((h) => h.unitId === id);
    if (hero) return !hero.isDowned;
    const enemy = battle.enemies.find((e) => e.unitId === id);
    if (enemy) return !enemy.isDowned && enemy.currentHp > 0;
    return false;
  });

  battle.initiativeOrder = livingOrder;
  let nextIndex = (battle.currentActorIndex + 1) % Math.max(livingOrder.length, 1);

  const nextActor = livingOrder[nextIndex];
  const nextHero = battle.heroes.find((h) => h.unitId === nextActor);
  battle.phase = nextHero ? 'HeroTurnAwaitingWord' : 'EnemyTurnReady';
  battle.currentActorIndex = nextIndex;
}

export function endBattle(state: RunRuntimeState): RunRuntimeState {
  const battle = state.battle;
  if (!battle) return state;

  const healedParty = state.party.map((h) => ({
    ...h,
    currentHp: h.maxHp,
    shield: 0,
    isDowned: false,
  }));

  const isBoss = catalogIsBossEncounter(battle.encounterId);

  return {
    ...state,
    revision: state.revision + 1,
    party: healedParty,
    battle: null,
    phase: isBoss ? 'ActComplete' : 'Intermission',
    gold: state.gold + (isBoss ? 100 : 25),
    encounterIndex: state.encounterIndex + 1,
  };
}

function catalogIsBossEncounter(encounterId: string): boolean {
  return encounterId.includes('boss');
}

export function fullHealParty(party: HeroRuntimeState[]): HeroRuntimeState[] {
  return party.map((h) => ({
    ...h,
    currentHp: h.maxHp,
    shield: 0,
    isDowned: false,
  }));
}
