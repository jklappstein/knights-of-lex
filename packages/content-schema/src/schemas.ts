import { z } from 'zod';

export const FoundationalSymbolSchema = z.enum([
  'strike',
  'shot',
  'spark',
  'guard',
  'heal',
]);

export const HeroDefinitionSchema = z
  .object({
    id: z.string(),
    schemaVersion: z.string(),
    displayName: z.string(),
    symbols: z.array(FoundationalSymbolSchema).length(3),
    abilityId: z.string(),
    triadRecipeId: z.string(),
    maxHp: z.number().positive(),
    initiative: z.number(),
    symbolCoefficients: z.record(FoundationalSymbolSchema, z.number()),
    skillTrees: z.array(
      z.object({
        symbol: FoundationalSymbolSchema,
        nodes: z.array(
          z.object({
            id: z.string(),
            displayName: z.string(),
            tier: z.number(),
            prerequisites: z.array(z.string()),
            modifiers: z.array(
              z.object({
                action: z.string(),
                amount: z.number(),
              }),
            ),
          }),
        ),
      }),
    ),
  })
  .passthrough();

export const EnemyDefinitionSchema = z
  .object({
    id: z.string(),
    schemaVersion: z.string(),
    displayName: z.string(),
    maxHp: z.number().positive(),
    initiative: z.number(),
    formationPreference: z.enum(['front', 'back']),
    attackDamage: z.number().positive(),
    isBoss: z.boolean().optional(),
    bossAbility: z.string().optional(),
  })
  .passthrough();

export const EncounterDefinitionSchema = z
  .object({
    id: z.string(),
    schemaVersion: z.string(),
    displayName: z.string(),
    enemies: z.array(z.string()).min(1),
    isBoss: z.boolean().optional(),
  })
  .passthrough();

export const ActDefinitionSchema = z
  .object({
    id: z.string(),
    schemaVersion: z.string(),
    displayName: z.string(),
    encounters: z.array(z.string()),
    bossEncounterId: z.string(),
  })
  .passthrough();

export const RecipeDefinitionSchema = z
  .object({
    id: z.string(),
    schemaVersion: z.string(),
    displayName: z.string(),
    kind: z.enum(['pure', 'pair', 'triad']),
    symbolKey: z.string(),
    effects: z.array(
      z.object({
        action: z.string(),
        baseMultiplier: z.number(),
        targetSelector: z.string(),
      }),
    ),
  })
  .passthrough();

export const EffectOwnershipSchema = z.record(z.string(), z.string());

export type HeroDefinition = z.infer<typeof HeroDefinitionSchema>;
export type EnemyDefinition = z.infer<typeof EnemyDefinitionSchema>;
export type EncounterDefinition = z.infer<typeof EncounterDefinitionSchema>;
export type ActDefinition = z.infer<typeof ActDefinitionSchema>;
export type RecipeDefinition = z.infer<typeof RecipeDefinitionSchema>;
