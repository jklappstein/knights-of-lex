import type {
  CommandOutcome,
  GameCommand,
  GameFact,
} from '@kol/shared-types';
import type { GameContentCatalog } from '@kol/content-runtime';
import { ALL_HERO_IDS } from '@kol/content-runtime';
import type { LexiconRuntime } from '@kol/lexicon-runtime';
import {
  createHeroState,
  endBattle,
  fullHealParty,
  projectRunView,
  resolveEnemyTurn,
  startBattle,
  submitWordInBattle,
  type HeroRuntimeState,
  type RunRuntimeState,
} from './run/RunState.js';
import { RngStreamRegistry } from './rng/StrictRng.js';
import { evaluateWord } from './word/WordEvaluator.js';
import type { HexCoord, WordEvaluation } from '@kol/shared-types';

export interface GameServices {
  readonly catalog: GameContentCatalog;
  readonly lexicon: LexiconRuntime;
}

export class GameService {
  private state: RunRuntimeState | null = null;
  private factLog: GameFact[] = [];

  constructor(private readonly services: GameServices) {}

  getView() {
    if (!this.state) return null;
    return projectRunView(this.state);
  }

  getFacts(): readonly GameFact[] {
    return this.factLog;
  }

  previewWord(
    heroId: string,
    path: readonly HexCoord[],
    boardRevision: number,
  ): WordEvaluation | { rejected: true; code: string } | null {
    const battle = this.state?.battle;
    if (!battle) return null;

    const hero = battle.heroes.find((h) => h.heroId === heroId);
    if (!hero) return null;

    return evaluateWord(
      this.services.catalog,
      this.services.lexicon,
      hero.board,
      path,
      boardRevision,
      hero.symbols,
      hero.triadRecipeId,
      hero.skillModifiers,
      battle.usedWords,
    );
  }

  dispatch(command: GameCommand): CommandOutcome {
    if (!this.state && command.type !== 'CreateRun') {
      return fail('NO_RUN', 'No active run');
    }

    const state = this.state;
    if (!state) {
      if (command.type === 'CreateRun') {
        return this.handleCreateRun(command);
      }
      return fail('NO_RUN', 'No active run');
    }

    if (command.expectedRevision !== state.revision) {
      return fail('STALE_REVISION', `Expected ${command.expectedRevision}, got ${state.revision}`);
    }

    switch (command.type) {
      case 'ChooseStartingHero':
        return this.handleChooseStartingHero(state, command.heroId);
      case 'RecruitHero':
        return this.handleRecruitHero(state, command.heroId);
      case 'AllocateSkillPoint':
        return this.handleAllocateSkill(state, command.heroId, command.nodeId);
      case 'SetFormation':
        return this.handleSetFormation(state, command.assignments);
      case 'StartEncounter':
        return this.handleStartEncounter(state);
      case 'SubmitWord':
        return this.handleSubmitWord(state, command);
      case 'ResolveEnemyTurn':
        return this.handleResolveEnemyTurn(state);
      case 'LeaveIntermission':
        return this.handleLeaveIntermission(state);
      default:
        return fail('UNKNOWN_COMMAND', `Unknown command: ${(command as GameCommand).type}`);
    }
  }

  private handleCreateRun(command: Extract<GameCommand, { type: 'CreateRun' }>): CommandOutcome {
    const rng = new RngStreamRegistry(command.seed);
    this.state = {
      seed: command.seed,
      revision: 1,
      phase: 'HeroSelection',
      actIndex: 0,
      encounterIndex: 0,
      gold: 0,
      party: [],
      battle: null,
      contentHash: this.services.catalog.gameplayContentHash,
      rng,
    };
    const facts: GameFact[] = [{ type: 'RunCreated', seed: command.seed }];
    this.factLog.push(...facts);
    return ok(1, facts);
  }

  private handleChooseStartingHero(state: RunRuntimeState, heroId: string): CommandOutcome {
    if (state.phase !== 'HeroSelection') return fail('INVALID_PHASE', 'Not in hero selection');
    if (!this.services.catalog.heroes.has(heroId)) return fail('UNKNOWN_HERO', heroId);

    const hero = createHeroState(this.services.catalog, heroId, 'hero-0', 'front', state.rng);
    this.state = {
      ...state,
      revision: state.revision + 1,
      phase: 'Formation',
      party: [hero],
    };
    const facts: GameFact[] = [{ type: 'StartingHeroChosen', heroId }];
    this.factLog.push(...facts);
    return ok(this.state.revision, facts);
  }

  private handleRecruitHero(state: RunRuntimeState, heroId: string): CommandOutcome {
    if (state.party.length >= 3) return fail('PARTY_FULL', 'Party is full');
    if (!this.services.catalog.heroes.has(heroId)) return fail('UNKNOWN_HERO', heroId);
    if (state.party.some((h) => h.heroId === heroId)) return fail('ALREADY_RECRUITED', heroId);

    const unitId = `hero-${state.party.length}`;
    const rank: 'front' | 'back' = state.party.length === 1 ? 'front' : 'back';
    const hero = createHeroState(this.services.catalog, heroId, unitId, rank, state.rng);

    this.state = {
      ...state,
      revision: state.revision + 1,
      party: [...state.party, hero],
    };
    const facts: GameFact[] = [{ type: 'HeroRecruited', heroId }];
    this.factLog.push(...facts);
    return ok(this.state.revision, facts);
  }

  private handleAllocateSkill(
    state: RunRuntimeState,
    heroId: string,
    nodeId: string,
  ): CommandOutcome {
    const hero = state.party.find((h) => h.heroId === heroId);
    if (!hero) return fail('HERO_NOT_FOUND', heroId);
    if (hero.allocatedSkills.includes(nodeId)) return fail('ALREADY_ALLOCATED', nodeId);

    const def = this.services.catalog.heroes.get(heroId);
    if (!def) return fail('UNKNOWN_HERO', heroId);

    let nodeFound = false;
    for (const tree of def.skillTrees) {
      for (const node of tree.nodes) {
        if (node.id === nodeId) {
          nodeFound = true;
          for (const mod of node.modifiers) {
            hero.skillModifiers[mod.action] = (hero.skillModifiers[mod.action] ?? 0) + mod.amount;
          }
        }
      }
    }
    if (!nodeFound) return fail('UNKNOWN_SKILL', nodeId);

    hero.allocatedSkills.push(nodeId);
    this.state = { ...state, revision: state.revision + 1 };
    const facts: GameFact[] = [{ type: 'SkillAllocated', heroId, nodeId }];
    this.factLog.push(...facts);
    return ok(this.state.revision, facts);
  }

  private handleSetFormation(
    state: RunRuntimeState,
    assignments: Readonly<Record<string, 'front' | 'back'>>,
  ): CommandOutcome {
    const party = state.party.map((h) => {
      const rank = assignments[h.heroId];
      if (rank) return { ...h, formationRank: rank };
      return h;
    });

    this.state = {
      ...state,
      revision: state.revision + 1,
      phase: 'Encounter',
      party,
    };
    const facts: GameFact[] = [{ type: 'FormationCommitted' }];
    this.factLog.push(...facts);
    return ok(this.state.revision, facts);
  }

  private handleStartEncounter(state: RunRuntimeState): CommandOutcome {
    const act = [...this.services.catalog.acts.values()][state.actIndex];
    if (!act) return fail('NO_ACT', 'No act defined');

    let encounterId: string;
    if (state.encounterIndex < act.encounters.length) {
      encounterId = act.encounters[state.encounterIndex] ?? act.encounters[0]!;
    } else {
      encounterId = act.bossEncounterId;
    }

    const healedParty = fullHealParty(state.party);
    const { state: newState, facts } = startBattle(
      { ...state, party: healedParty },
      this.services.catalog,
      encounterId,
    );
    this.state = newState;
    this.factLog.push(...facts);
    return ok(newState.revision, facts);
  }

  private handleSubmitWord(
    state: RunRuntimeState,
    command: Extract<GameCommand, { type: 'SubmitWord' }>,
  ): CommandOutcome {
    const { state: newState, facts, rejected } = submitWordInBattle(
      state,
      this.services.catalog,
      this.services.lexicon,
      command.heroId,
      command.path,
      command.boardRevision,
    );
    if (rejected) return fail(rejected, rejected);
    this.state = newState;

    if (newState.battle?.phase === 'Victory') {
      this.state = endBattle(newState);
    }

    this.factLog.push(...facts);
    return ok(this.state.revision, facts);
  }

  private handleResolveEnemyTurn(state: RunRuntimeState): CommandOutcome {
    const { state: newState, facts, rejected } = resolveEnemyTurn(state);
    if (rejected) return fail(rejected, rejected);
    this.state = newState;

    if (newState.battle?.phase === 'Victory') {
      this.state = endBattle(newState);
    } else if (newState.battle?.phase === 'Defeat') {
      this.state = { ...newState, phase: 'RunDefeat', battle: null };
    }

    this.factLog.push(...facts);
    return ok(this.state.revision, facts);
  }

  private handleLeaveIntermission(state: RunRuntimeState): CommandOutcome {
    if (state.phase !== 'Intermission' && state.phase !== 'Formation') {
      return fail('INVALID_PHASE', 'Not in intermission');
    }
    this.state = {
      ...state,
      revision: state.revision + 1,
      phase: 'Encounter',
    };
    return ok(this.state.revision, []);
  }
}

function ok(revision: number, facts: GameFact[]): CommandOutcome {
  return { result: { ok: true, revision }, facts };
}

function fail(code: string, message: string): CommandOutcome {
  return { result: { ok: false, code, message }, facts: [] };
}

export function getEncounterSequence(catalog: GameContentCatalog, actIndex: number): string[] {
  const act = [...catalog.acts.values()][actIndex];
  if (!act) return [];
  return [...act.encounters, act.bossEncounterId];
}

export function getAllSkillNodesForHero(
  catalog: GameContentCatalog,
  heroId: string,
): readonly string[] {
  const def = catalog.heroes.get(heroId);
  if (!def) return [];
  return def.skillTrees.flatMap((t) => t.nodes.map((n) => n.id));
}

export function getRecruitableHeroes(
  currentParty: readonly HeroRuntimeState[],
): readonly string[] {
  const inParty = new Set(currentParty.map((h) => h.heroId));
  return ALL_HERO_IDS.filter((id) => !inParty.has(id));
}

export type { RunRuntimeState, HeroRuntimeState };
