import { simpleHash } from '@kol/shared-types';
import type {
  ActDefinition,
  EncounterDefinition,
  EnemyDefinition,
  HeroDefinition,
  RecipeDefinition,
} from '@kol/content-schema';
import {
  ActDefinitionSchema,
  EncounterDefinitionSchema,
  EnemyDefinitionSchema,
  HeroDefinitionSchema,
  RecipeDefinitionSchema,
} from '@kol/content-schema';

export interface GameContentCatalog {
  readonly heroes: ReadonlyMap<string, HeroDefinition>;
  readonly enemies: ReadonlyMap<string, EnemyDefinition>;
  readonly encounters: ReadonlyMap<string, EncounterDefinition>;
  readonly acts: ReadonlyMap<string, ActDefinition>;
  readonly recipes: ReadonlyMap<string, RecipeDefinition>;
  readonly effectOwnership: Readonly<Record<string, string>>;
  readonly gameplayContentHash: string;
}

function hashContent(data: string): string {
  return simpleHash(data);
}

function parseArray<T>(
  items: readonly unknown[],
  schema: { parse: (value: unknown) => T },
): readonly T[] {
  return items.map((item) => schema.parse(item));
}

export function loadGameContent(raw: {
  heroes: readonly unknown[];
  enemies: readonly unknown[];
  encounters: readonly unknown[];
  acts: readonly unknown[];
  recipes: readonly unknown[];
  effectOwnership: Readonly<Record<string, string>>;
}): GameContentCatalog {
  const heroes = parseArray(raw.heroes, HeroDefinitionSchema);
  const enemies = parseArray(raw.enemies, EnemyDefinitionSchema);
  const encounters = parseArray(raw.encounters, EncounterDefinitionSchema);
  const acts = parseArray(raw.acts, ActDefinitionSchema);
  const recipes = parseArray(raw.recipes, RecipeDefinitionSchema);

  const gameplayContentHash = hashContent(JSON.stringify({
    heroes,
    enemies,
    encounters,
    acts,
    recipes,
    effectOwnership: raw.effectOwnership,
  }));

  return {
    heroes: new Map(heroes.map((h) => [h.id, h])),
    enemies: new Map(enemies.map((e) => [e.id, e])),
    encounters: new Map(encounters.map((e) => [e.id, e])),
    acts: new Map(acts.map((a) => [a.id, a])),
    recipes: new Map(recipes.map((r) => [r.id, r])),
    effectOwnership: raw.effectOwnership,
    gameplayContentHash,
  };
}

export { BUNDLED_CONTENT } from './bundledContent.js';
