import type { GameContentCatalog } from './ContentLoader.js';
import { loadGameContent } from './ContentLoader.js';

const heroes = [
  {
    id: 'hero.corsair',
    schemaVersion: '1',
    displayName: 'Corsair',
    symbols: ['strike', 'shot', 'spark'],
    abilityId: 'ability.corsair.full_salvo',
    triadRecipeId: 'recipe.triad.corsair.broadside',
    maxHp: 100,
    initiative: 12,
    symbolCoefficients: { strike: 10, shot: 10, spark: 7, guard: 10, heal: 10 },
    skillTrees: [
      { symbol: 'strike', nodes: [{ id: 'skill.corsair.strike.1', displayName: 'Keen Blade', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 2 }] }] },
      { symbol: 'shot', nodes: [{ id: 'skill.corsair.shot.1', displayName: 'Steady Aim', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 2 }] }] },
      { symbol: 'spark', nodes: [{ id: 'skill.corsair.spark.1', displayName: 'Arc Focus', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 1 }] }] },
    ],
  },
  {
    id: 'hero.skirmisher',
    schemaVersion: '1',
    displayName: 'Skirmisher',
    symbols: ['strike', 'shot', 'guard'],
    abilityId: 'ability.skirmisher.footwork',
    triadRecipeId: 'recipe.triad.skirmisher.hit_and_run',
    maxHp: 95,
    initiative: 14,
    symbolCoefficients: { strike: 10, shot: 10, spark: 7, guard: 10, heal: 10 },
    skillTrees: [
      { symbol: 'strike', nodes: [{ id: 'skill.skirmisher.strike.1', displayName: 'Quick Strike', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 2 }] }] },
      { symbol: 'shot', nodes: [{ id: 'skill.skirmisher.shot.1', displayName: 'Snap Shot', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 2 }] }] },
      { symbol: 'guard', nodes: [{ id: 'skill.skirmisher.guard.1', displayName: 'Evasive Guard', tier: 1, prerequisites: [], modifiers: [{ action: 'gain_shield', amount: 3 }] }] },
    ],
  },
  {
    id: 'hero.valkyrie',
    schemaVersion: '1',
    displayName: 'Valkyrie',
    symbols: ['strike', 'shot', 'heal'],
    abilityId: 'ability.valkyrie.battle_mercy',
    triadRecipeId: 'recipe.triad.valkyrie.rescue_charge',
    maxHp: 105,
    initiative: 11,
    symbolCoefficients: { strike: 10, shot: 10, spark: 7, guard: 10, heal: 10 },
    skillTrees: [
      { symbol: 'strike', nodes: [{ id: 'skill.valkyrie.strike.1', displayName: 'War Strike', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 2 }] }] },
      { symbol: 'shot', nodes: [{ id: 'skill.valkyrie.shot.1', displayName: 'Winged Shot', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 2 }] }] },
      { symbol: 'heal', nodes: [{ id: 'skill.valkyrie.heal.1', displayName: 'Mercy Touch', tier: 1, prerequisites: [], modifiers: [{ action: 'heal', amount: 3 }] }] },
    ],
  },
  {
    id: 'hero.spellblade',
    schemaVersion: '1',
    displayName: 'Spellblade',
    symbols: ['strike', 'spark', 'guard'],
    abilityId: 'ability.spellblade.spellweave',
    triadRecipeId: 'recipe.triad.spellblade.arcane_riposte',
    maxHp: 90,
    initiative: 13,
    symbolCoefficients: { strike: 10, shot: 10, spark: 7, guard: 10, heal: 10 },
    skillTrees: [
      { symbol: 'strike', nodes: [{ id: 'skill.spellblade.strike.1', displayName: 'Arc Blade', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 2 }] }] },
      { symbol: 'spark', nodes: [{ id: 'skill.spellblade.spark.1', displayName: 'Spell Focus', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 1 }] }] },
      { symbol: 'guard', nodes: [{ id: 'skill.spellblade.guard.1', displayName: 'Ward Blade', tier: 1, prerequisites: [], modifiers: [{ action: 'gain_shield', amount: 3 }] }] },
    ],
  },
  {
    id: 'hero.paladin',
    schemaVersion: '1',
    displayName: 'Paladin',
    symbols: ['strike', 'spark', 'heal'],
    abilityId: 'ability.paladin.lay_on_hands',
    triadRecipeId: 'recipe.triad.paladin.radiant_judgment',
    maxHp: 110,
    initiative: 10,
    symbolCoefficients: { strike: 10, shot: 10, spark: 7, guard: 10, heal: 10 },
    skillTrees: [
      { symbol: 'strike', nodes: [{ id: 'skill.paladin.strike.1', displayName: 'Holy Strike', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 2 }] }] },
      { symbol: 'spark', nodes: [{ id: 'skill.paladin.spark.1', displayName: 'Divine Spark', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 1 }] }] },
      { symbol: 'heal', nodes: [{ id: 'skill.paladin.heal.1', displayName: 'Lay Hands', tier: 1, prerequisites: [], modifiers: [{ action: 'heal', amount: 4 }] }] },
    ],
  },
  {
    id: 'hero.vanguard',
    schemaVersion: '1',
    displayName: 'Vanguard',
    symbols: ['strike', 'guard', 'heal'],
    abilityId: 'ability.vanguard.hold_fast',
    triadRecipeId: 'recipe.triad.vanguard.last_bastion',
    maxHp: 120,
    initiative: 9,
    symbolCoefficients: { strike: 10, shot: 10, spark: 7, guard: 10, heal: 10 },
    skillTrees: [
      { symbol: 'strike', nodes: [{ id: 'skill.vanguard.strike.1', displayName: 'Heavy Strike', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 3 }] }] },
      { symbol: 'guard', nodes: [{ id: 'skill.vanguard.guard.1', displayName: 'Iron Guard', tier: 1, prerequisites: [], modifiers: [{ action: 'gain_shield', amount: 5 }] }] },
      { symbol: 'heal', nodes: [{ id: 'skill.vanguard.heal.1', displayName: 'Field Medic', tier: 1, prerequisites: [], modifiers: [{ action: 'heal', amount: 3 }] }] },
    ],
  },
  {
    id: 'hero.spellbow',
    schemaVersion: '1',
    displayName: 'Spellbow',
    symbols: ['shot', 'spark', 'guard'],
    abilityId: 'ability.spellbow.runic_draw',
    triadRecipeId: 'recipe.triad.spellbow.tempest_screen',
    maxHp: 85,
    initiative: 15,
    symbolCoefficients: { strike: 10, shot: 10, spark: 7, guard: 10, heal: 10 },
    skillTrees: [
      { symbol: 'shot', nodes: [{ id: 'skill.spellbow.shot.1', displayName: 'Runic Shot', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 2 }] }] },
      { symbol: 'spark', nodes: [{ id: 'skill.spellbow.spark.1', displayName: 'Arc Draw', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 1 }] }] },
      { symbol: 'guard', nodes: [{ id: 'skill.spellbow.guard.1', displayName: 'Wind Guard', tier: 1, prerequisites: [], modifiers: [{ action: 'gain_shield', amount: 3 }] }] },
    ],
  },
  {
    id: 'hero.druid',
    schemaVersion: '1',
    displayName: 'Druid',
    symbols: ['shot', 'spark', 'heal'],
    abilityId: 'ability.druid.deep_roots',
    triadRecipeId: 'recipe.triad.druid.verdant_storm',
    maxHp: 95,
    initiative: 12,
    symbolCoefficients: { strike: 10, shot: 10, spark: 7, guard: 10, heal: 10 },
    skillTrees: [
      { symbol: 'shot', nodes: [{ id: 'skill.druid.shot.1', displayName: 'Thorn Shot', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 2 }] }] },
      { symbol: 'spark', nodes: [{ id: 'skill.druid.spark.1', displayName: 'Nature Spark', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 1 }] }] },
      { symbol: 'heal', nodes: [{ id: 'skill.druid.heal.1', displayName: 'Verdant Heal', tier: 1, prerequisites: [], modifiers: [{ action: 'heal', amount: 4 }] }] },
    ],
  },
  {
    id: 'hero.ranger',
    schemaVersion: '1',
    displayName: 'Ranger',
    symbols: ['shot', 'guard', 'heal'],
    abilityId: 'ability.ranger.longbow',
    triadRecipeId: 'recipe.triad.ranger.rescue_volley',
    maxHp: 90,
    initiative: 14,
    symbolCoefficients: { strike: 10, shot: 10, spark: 7, guard: 10, heal: 10 },
    skillTrees: [
      { symbol: 'shot', nodes: [{ id: 'skill.ranger.shot.1', displayName: 'Long Shot', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 3 }] }] },
      { symbol: 'guard', nodes: [{ id: 'skill.ranger.guard.1', displayName: 'Camo Guard', tier: 1, prerequisites: [], modifiers: [{ action: 'gain_shield', amount: 3 }] }] },
      { symbol: 'heal', nodes: [{ id: 'skill.ranger.heal.1', displayName: 'Field Heal', tier: 1, prerequisites: [], modifiers: [{ action: 'heal', amount: 3 }] }] },
    ],
  },
  {
    id: 'hero.cleric',
    schemaVersion: '1',
    displayName: 'Cleric',
    symbols: ['spark', 'guard', 'heal'],
    abilityId: 'ability.cleric.mercy',
    triadRecipeId: 'recipe.triad.cleric.purifying_light',
    maxHp: 100,
    initiative: 11,
    symbolCoefficients: { strike: 10, shot: 10, spark: 7, guard: 10, heal: 10 },
    skillTrees: [
      { symbol: 'spark', nodes: [{ id: 'skill.cleric.spark.1', displayName: 'Holy Spark', tier: 1, prerequisites: [], modifiers: [{ action: 'deal_damage', amount: 1 }] }] },
      { symbol: 'guard', nodes: [{ id: 'skill.cleric.guard.1', displayName: 'Sacred Guard', tier: 1, prerequisites: [], modifiers: [{ action: 'gain_shield', amount: 4 }] }] },
      { symbol: 'heal', nodes: [{ id: 'skill.cleric.heal.1', displayName: 'Divine Mercy', tier: 1, prerequisites: [], modifiers: [{ action: 'heal', amount: 5 }] }] },
    ],
  },
] as const;

const enemies = [
  { id: 'enemy.goblin_scout', schemaVersion: '1', displayName: 'Goblin Scout', maxHp: 40, initiative: 8, formationPreference: 'front', attackDamage: 8 },
  { id: 'enemy.goblin_archer', schemaVersion: '1', displayName: 'Goblin Archer', maxHp: 30, initiative: 10, formationPreference: 'back', attackDamage: 10 },
  { id: 'enemy.orc_brute', schemaVersion: '1', displayName: 'Orc Brute', maxHp: 60, initiative: 7, formationPreference: 'front', attackDamage: 12 },
  { id: 'enemy.shadow_mage', schemaVersion: '1', displayName: 'Shadow Mage', maxHp: 35, initiative: 12, formationPreference: 'back', attackDamage: 14 },
  { id: 'enemy.boss.zed_king', schemaVersion: '1', displayName: 'Zed King', maxHp: 120, initiative: 6, formationPreference: 'front', attackDamage: 15, isBoss: true, bossAbility: 'mutate_letter' },
] as const;

const encounters = [
  { id: 'encounter.act1.fight1', schemaVersion: '1', displayName: 'Goblin Patrol', enemies: ['enemy.goblin_scout', 'enemy.goblin_archer'] },
  { id: 'encounter.act1.fight2', schemaVersion: '1', displayName: 'Orc Ambush', enemies: ['enemy.orc_brute', 'enemy.goblin_archer'] },
  { id: 'encounter.act1.fight3', schemaVersion: '1', displayName: 'Shadow Cult', enemies: ['enemy.shadow_mage', 'enemy.goblin_scout'] },
  { id: 'encounter.act1.boss', schemaVersion: '1', displayName: 'The Zed King', enemies: ['enemy.boss.zed_king'], isBoss: true },
] as const;

const acts = [
  {
    id: 'act.lex_province_01',
    schemaVersion: '1',
    displayName: 'Lex Province',
    encounters: ['encounter.act1.fight1', 'encounter.act1.fight2', 'encounter.act1.fight3'],
    bossEncounterId: 'encounter.act1.boss',
  },
] as const;

const recipes = [
  { id: 'recipe.pure.strike', schemaVersion: '1', displayName: 'Strike', kind: 'pure', symbolKey: 'strike', effects: [{ action: 'deal_damage', baseMultiplier: 1, targetSelector: 'frontmost_enemy' }] },
  { id: 'recipe.pure.shot', schemaVersion: '1', displayName: 'Shot', kind: 'pure', symbolKey: 'shot', effects: [{ action: 'deal_damage', baseMultiplier: 1, targetSelector: 'rearmost_enemy' }] },
  { id: 'recipe.pure.spark', schemaVersion: '1', displayName: 'Spark', kind: 'pure', symbolKey: 'spark', effects: [{ action: 'deal_damage', baseMultiplier: 0.6, targetSelector: 'all_enemies' }] },
  { id: 'recipe.pure.guard', schemaVersion: '1', displayName: 'Guard', kind: 'pure', symbolKey: 'guard', effects: [{ action: 'gain_shield', baseMultiplier: 1, targetSelector: 'acting_hero' }] },
  { id: 'recipe.pure.heal', schemaVersion: '1', displayName: 'Heal', kind: 'pure', symbolKey: 'heal', effects: [{ action: 'heal', baseMultiplier: 1, targetSelector: 'lowest_hp_ally' }] },
  { id: 'recipe.pair.strike_shot', schemaVersion: '1', displayName: 'Force Strike', kind: 'pair', symbolKey: 'strike_shot', effects: [{ action: 'deal_damage', baseMultiplier: 1.4, targetSelector: 'rearmost_enemy' }] },
  { id: 'recipe.pair.strike_spark', schemaVersion: '1', displayName: 'Smite', kind: 'pair', symbolKey: 'strike_spark', effects: [{ action: 'deal_damage', baseMultiplier: 1.3, targetSelector: 'frontmost_enemy' }] },
  { id: 'recipe.pair.strike_guard', schemaVersion: '1', displayName: 'Shield Slam', kind: 'pair', symbolKey: 'strike_guard', effects: [{ action: 'gain_shield', baseMultiplier: 0.5, targetSelector: 'acting_hero' }, { action: 'deal_damage', baseMultiplier: 0.8, targetSelector: 'frontmost_enemy' }] },
  { id: 'recipe.pair.strike_heal', schemaVersion: '1', displayName: 'Vampiric Strike', kind: 'pair', symbolKey: 'strike_heal', effects: [{ action: 'deal_damage', baseMultiplier: 1, targetSelector: 'frontmost_enemy' }, { action: 'heal', baseMultiplier: 0.5, targetSelector: 'acting_hero' }] },
  { id: 'recipe.pair.shot_spark', schemaVersion: '1', displayName: 'Chain Shot', kind: 'pair', symbolKey: 'shot_spark', effects: [{ action: 'deal_damage', baseMultiplier: 1.2, targetSelector: 'all_enemies' }] },
  { id: 'recipe.pair.shot_guard', schemaVersion: '1', displayName: 'Overwatch', kind: 'pair', symbolKey: 'shot_guard', effects: [{ action: 'gain_shield', baseMultiplier: 0.8, targetSelector: 'acting_hero' }] },
  { id: 'recipe.pair.shot_heal', schemaVersion: '1', displayName: 'Healing Volley', kind: 'pair', symbolKey: 'shot_heal', effects: [{ action: 'heal', baseMultiplier: 0.8, targetSelector: 'all_allies' }] },
  { id: 'recipe.pair.spark_guard', schemaVersion: '1', displayName: 'Electric Field', kind: 'pair', symbolKey: 'spark_guard', effects: [{ action: 'gain_shield', baseMultiplier: 0.7, targetSelector: 'acting_hero' }, { action: 'deal_damage', baseMultiplier: 0.5, targetSelector: 'all_enemies' }] },
  { id: 'recipe.pair.spark_heal', schemaVersion: '1', displayName: 'Regeneration', kind: 'pair', symbolKey: 'spark_heal', effects: [{ action: 'heal', baseMultiplier: 0.6, targetSelector: 'all_allies' }] },
  { id: 'recipe.pair.guard_heal', schemaVersion: '1', displayName: 'Sanctuary', kind: 'pair', symbolKey: 'guard_heal', effects: [{ action: 'heal', baseMultiplier: 1, targetSelector: 'lowest_hp_ally' }, { action: 'gain_shield', baseMultiplier: 0.5, targetSelector: 'lowest_hp_ally' }] },
  { id: 'recipe.triad.vanguard.last_bastion', schemaVersion: '1', displayName: 'Last Bastion', kind: 'triad', symbolKey: 'strike_guard_heal', effects: [{ action: 'gain_shield', baseMultiplier: 1.2, targetSelector: 'all_allies' }, { action: 'heal', baseMultiplier: 0.8, targetSelector: 'lowest_hp_ally' }] },
  { id: 'recipe.triad.ranger.rescue_volley', schemaVersion: '1', displayName: 'Rescue Volley', kind: 'triad', symbolKey: 'shot_guard_heal', effects: [{ action: 'heal', baseMultiplier: 1, targetSelector: 'all_allies' }, { action: 'deal_damage', baseMultiplier: 0.8, targetSelector: 'frontmost_enemy' }] },
  { id: 'recipe.triad.cleric.purifying_light', schemaVersion: '1', displayName: 'Purifying Light', kind: 'triad', symbolKey: 'spark_guard_heal', effects: [{ action: 'deal_damage', baseMultiplier: 0.7, targetSelector: 'all_enemies' }, { action: 'heal', baseMultiplier: 1, targetSelector: 'all_allies' }, { action: 'gain_shield', baseMultiplier: 0.5, targetSelector: 'all_allies' }] },
  { id: 'recipe.triad.corsair.broadside', schemaVersion: '1', displayName: 'Broadside', kind: 'triad', symbolKey: 'strike_shot_spark', effects: [{ action: 'deal_damage', baseMultiplier: 1.1, targetSelector: 'all_enemies' }] },
  { id: 'recipe.triad.skirmisher.hit_and_run', schemaVersion: '1', displayName: 'Hit and Run', kind: 'triad', symbolKey: 'strike_shot_guard', effects: [{ action: 'deal_damage', baseMultiplier: 0.9, targetSelector: 'frontmost_enemy' }, { action: 'deal_damage', baseMultiplier: 0.9, targetSelector: 'rearmost_enemy' }, { action: 'gain_shield', baseMultiplier: 0.5, targetSelector: 'acting_hero' }] },
  { id: 'recipe.triad.valkyrie.rescue_charge', schemaVersion: '1', displayName: 'Rescue Charge', kind: 'triad', symbolKey: 'strike_shot_heal', effects: [{ action: 'deal_damage', baseMultiplier: 0.8, targetSelector: 'frontmost_enemy' }, { action: 'heal', baseMultiplier: 0.8, targetSelector: 'all_allies' }] },
  { id: 'recipe.triad.spellblade.arcane_riposte', schemaVersion: '1', displayName: 'Arcane Riposte', kind: 'triad', symbolKey: 'strike_spark_guard', effects: [{ action: 'deal_damage', baseMultiplier: 1.2, targetSelector: 'frontmost_enemy' }, { action: 'gain_shield', baseMultiplier: 0.6, targetSelector: 'acting_hero' }] },
  { id: 'recipe.triad.paladin.radiant_judgment', schemaVersion: '1', displayName: 'Radiant Judgment', kind: 'triad', symbolKey: 'strike_spark_heal', effects: [{ action: 'deal_damage', baseMultiplier: 1, targetSelector: 'frontmost_enemy' }, { action: 'heal', baseMultiplier: 0.7, targetSelector: 'all_allies' }] },
  { id: 'recipe.triad.spellbow.tempest_screen', schemaVersion: '1', displayName: 'Tempest Screen', kind: 'triad', symbolKey: 'shot_spark_guard', effects: [{ action: 'deal_damage', baseMultiplier: 1, targetSelector: 'all_enemies' }, { action: 'gain_shield', baseMultiplier: 0.8, targetSelector: 'acting_hero' }] },
  { id: 'recipe.triad.druid.verdant_storm', schemaVersion: '1', displayName: 'Verdant Storm', kind: 'triad', symbolKey: 'shot_spark_heal', effects: [{ action: 'deal_damage', baseMultiplier: 0.7, targetSelector: 'all_enemies' }, { action: 'heal', baseMultiplier: 0.8, targetSelector: 'all_allies' }] },
] as const;

const effectOwnership = {
  deal_damage: 'EffectExecutor',
  gain_shield: 'EffectExecutor',
  heal: 'EffectExecutor',
  apply_status: 'EffectExecutor',
  mutate_letter: 'BoardMutationAuthority',
} as const;

export const BUNDLED_CONTENT: GameContentCatalog = loadGameContent({
  heroes: [...heroes],
  enemies: [...enemies],
  encounters: [...encounters],
  acts: [...acts],
  recipes: [...recipes],
  effectOwnership,
});

export const ALL_HERO_IDS = heroes.map((h) => h.id);
export const RECRUITABLE_HERO_IDS = ALL_HERO_IDS;
