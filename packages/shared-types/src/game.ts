export const FOUNDATIONAL_SYMBOLS = [
  'strike',
  'shot',
  'spark',
  'guard',
  'heal',
] as const;

export type FoundationalSymbol = (typeof FOUNDATIONAL_SYMBOLS)[number];

export type FormationRank = 'front' | 'back';

export interface HexCoord {
  readonly q: number;
  readonly r: number;
}

export interface SymbolPowerVector {
  readonly strike: number;
  readonly shot: number;
  readonly spark: number;
  readonly guard: number;
  readonly heal: number;
}

export type SymbolCounts = Record<FoundationalSymbol, number>;

export type SymbolSetKey = 'pure' | 'pair' | 'triad';

export interface TileState {
  readonly coord: HexCoord;
  readonly letter: string;
  readonly combatSymbol: FoundationalSymbol;
  readonly revision: number;
}

export interface HeroSnapshot {
  readonly heroId: string;
  readonly unitId: string;
  readonly level: number;
  readonly xp: number;
  readonly maxHp: number;
  readonly currentHp: number;
  readonly shield: number;
  readonly formationRank: FormationRank;
  readonly symbols: readonly FoundationalSymbol[];
  readonly abilityId: string;
  readonly allocatedSkills: readonly string[];
  readonly isDowned: boolean;
}

export interface EnemySnapshot {
  readonly enemyId: string;
  readonly unitId: string;
  readonly displayName: string;
  readonly maxHp: number;
  readonly currentHp: number;
  readonly shield: number;
  readonly formationRank: FormationRank;
  readonly isBoss: boolean;
  readonly intentLabel: string;
}

export type BattlePhase =
  | 'PreBattleFormation'
  | 'BattleInitialization'
  | 'InitiativeReady'
  | 'HeroTurnAwaitingWord'
  | 'EnemyTurnReady'
  | 'ResolutionCommitted'
  | 'PresentationPlayback'
  | 'InitiativeAdvanced'
  | 'Victory'
  | 'Defeat';

export type RunPhase =
  | 'RunStart'
  | 'HeroSelection'
  | 'Formation'
  | 'Encounter'
  | 'Intermission'
  | 'BossReward'
  | 'ActComplete'
  | 'RunVictory'
  | 'RunDefeat';

export interface PlannedEffect {
  readonly action: string;
  readonly amount: number;
  readonly targetSelector: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface WordEvaluation {
  readonly boardRevision: number;
  readonly normalizedWord: string;
  readonly path: readonly HexCoord[];
  readonly symbolCounts: SymbolCounts;
  readonly distinctSymbolKey: SymbolSetKey;
  readonly recipeId: string;
  readonly moveName: string;
  readonly lengthScalar: number;
  readonly semanticTags: readonly string[];
  readonly effectPlan: readonly PlannedEffect[];
  readonly evaluationDigest: string;
}

export interface BoardView {
  readonly heroId: string;
  readonly revision: number;
  readonly tiles: readonly TileState[];
}

export interface BattleView {
  readonly phase: BattlePhase;
  readonly initiativeOrder: readonly string[];
  readonly currentActorId: string | null;
  readonly heroes: readonly HeroSnapshot[];
  readonly enemies: readonly EnemySnapshot[];
  readonly boards: readonly BoardView[];
  readonly usedWords: readonly string[];
  readonly revision: number;
}

export interface RunView {
  readonly seed: number;
  readonly phase: RunPhase;
  readonly actIndex: number;
  readonly encounterIndex: number;
  readonly gold: number;
  readonly party: readonly HeroSnapshot[];
  readonly battle: BattleView | null;
  readonly revision: number;
  readonly contentHash: string;
}
