export type Brand<T, B extends string> = T & { readonly __brand: B };

export type HeroId = Brand<string, 'HeroId'>;
export type EnemyId = Brand<string, 'EnemyId'>;
export type BossId = Brand<string, 'BossId'>;
export type RecipeId = Brand<string, 'RecipeId'>;
export type AbilityId = Brand<string, 'AbilityId'>;
export type ItemId = Brand<string, 'ItemId'>;
export type EncounterId = Brand<string, 'EncounterId'>;
export type ActId = Brand<string, 'ActId'>;
export type UnitId = Brand<string, 'UnitId'>;
export type SemanticTagId = Brand<string, 'SemanticTagId'>;
export type SkillNodeId = Brand<string, 'SkillNodeId'>;

export function heroId(id: string): HeroId {
  return id as HeroId;
}

export function enemyId(id: string): EnemyId {
  return id as EnemyId;
}

export function bossId(id: string): BossId {
  return id as BossId;
}

export function recipeId(id: string): RecipeId {
  return id as RecipeId;
}

export function abilityId(id: string): AbilityId {
  return id as AbilityId;
}

export function itemId(id: string): ItemId {
  return id as ItemId;
}

export function encounterId(id: string): EncounterId {
  return id as EncounterId;
}

export function actId(id: string): ActId {
  return id as ActId;
}

export function unitId(id: string): UnitId {
  return id as UnitId;
}

export function semanticTagId(id: string): SemanticTagId {
  return id as SemanticTagId;
}

export function skillNodeId(id: string): SkillNodeId {
  return id as SkillNodeId;
}
