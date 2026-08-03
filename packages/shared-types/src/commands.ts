import type { HexCoord } from './game.js';

export type CommandResult =
  | { readonly ok: true; readonly revision: number }
  | { readonly ok: false; readonly code: string; readonly message: string };

export interface CreateRunCommand {
  readonly type: 'CreateRun';
  readonly seed: number;
  readonly expectedRevision: number;
}

export interface ChooseStartingHeroCommand {
  readonly type: 'ChooseStartingHero';
  readonly heroId: string;
  readonly expectedRevision: number;
}

export interface RecruitHeroCommand {
  readonly type: 'RecruitHero';
  readonly heroId: string;
  readonly expectedRevision: number;
}

export interface AllocateSkillPointCommand {
  readonly type: 'AllocateSkillPoint';
  readonly heroId: string;
  readonly nodeId: string;
  readonly expectedRevision: number;
}

export interface SetFormationCommand {
  readonly type: 'SetFormation';
  readonly assignments: Readonly<Record<string, 'front' | 'back'>>;
  readonly expectedRevision: number;
}

export interface StartEncounterCommand {
  readonly type: 'StartEncounter';
  readonly expectedRevision: number;
}

export interface SubmitWordCommand {
  readonly type: 'SubmitWord';
  readonly heroId: string;
  readonly path: readonly HexCoord[];
  readonly boardRevision: number;
  readonly expectedRevision: number;
}

export interface ResolveEnemyTurnCommand {
  readonly type: 'ResolveEnemyTurn';
  readonly expectedRevision: number;
}

export interface LeaveIntermissionCommand {
  readonly type: 'LeaveIntermission';
  readonly expectedRevision: number;
}

export type GameCommand =
  | CreateRunCommand
  | ChooseStartingHeroCommand
  | RecruitHeroCommand
  | AllocateSkillPointCommand
  | SetFormationCommand
  | StartEncounterCommand
  | SubmitWordCommand
  | ResolveEnemyTurnCommand
  | LeaveIntermissionCommand;

export interface FactBase {
  readonly type: string;
}

export interface RunCreatedFact extends FactBase {
  readonly type: 'RunCreated';
  readonly seed: number;
}

export interface StartingHeroChosenFact extends FactBase {
  readonly type: 'StartingHeroChosen';
  readonly heroId: string;
}

export interface HeroRecruitedFact extends FactBase {
  readonly type: 'HeroRecruited';
  readonly heroId: string;
}

export interface SkillAllocatedFact extends FactBase {
  readonly type: 'SkillAllocated';
  readonly heroId: string;
  readonly nodeId: string;
}

export interface FormationCommittedFact extends FactBase {
  readonly type: 'FormationCommitted';
}

export interface BattleStartedFact extends FactBase {
  readonly type: 'BattleStarted';
  readonly encounterId: string;
}

export interface InitiativeOrderCommittedFact extends FactBase {
  readonly type: 'InitiativeOrderCommitted';
  readonly order: readonly string[];
}

export interface WordCommittedFact extends FactBase {
  readonly type: 'WordCommitted';
  readonly heroId: string;
  readonly normalizedWord: string;
  readonly moveName: string;
  readonly evaluationDigest: string;
}

export interface DamageDealtFact extends FactBase {
  readonly type: 'DamageDealt';
  readonly sourceId: string;
  readonly targetId: string;
  readonly amount: number;
}

export interface ShieldGainedFact extends FactBase {
  readonly type: 'ShieldGained';
  readonly targetId: string;
  readonly amount: number;
}

export interface HealingAppliedFact extends FactBase {
  readonly type: 'HealingApplied';
  readonly targetId: string;
  readonly amount: number;
}

export interface TilesRefilledFact extends FactBase {
  readonly type: 'TilesRefilled';
  readonly heroId: string;
  readonly coords: readonly HexCoord[];
}

export interface TurnAdvancedFact extends FactBase {
  readonly type: 'TurnAdvanced';
  readonly nextActorId: string | null;
}

export interface HeroDownedFact extends FactBase {
  readonly type: 'HeroDowned';
  readonly unitId: string;
}

export interface BattleWonFact extends FactBase {
  readonly type: 'BattleWon';
}

export interface BattleLostFact extends FactBase {
  readonly type: 'BattleLost';
}

export interface EnemyIntentCommittedFact extends FactBase {
  readonly type: 'EnemyIntentCommitted';
  readonly enemyId: string;
  readonly intentLabel: string;
}

export type GameFact =
  | RunCreatedFact
  | StartingHeroChosenFact
  | HeroRecruitedFact
  | SkillAllocatedFact
  | FormationCommittedFact
  | BattleStartedFact
  | InitiativeOrderCommittedFact
  | WordCommittedFact
  | DamageDealtFact
  | ShieldGainedFact
  | HealingAppliedFact
  | TilesRefilledFact
  | TurnAdvancedFact
  | HeroDownedFact
  | BattleWonFact
  | BattleLostFact
  | EnemyIntentCommittedFact;

export interface CommandOutcome {
  readonly result: CommandResult;
  readonly facts: readonly GameFact[];
}
