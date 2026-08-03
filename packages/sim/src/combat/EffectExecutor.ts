import type { FormationRank } from '@kol/shared-types';

export interface CombatUnit {
  unitId: string;
  isHero: boolean;
  heroId?: string;
  enemyId?: string;
  displayName: string;
  maxHp: number;
  currentHp: number;
  shield: number;
  formationRank: FormationRank;
  isDowned: boolean;
  isBoss: boolean;
}

export function selectTargets(
  selector: string,
  actingUnitId: string,
  heroes: readonly CombatUnit[],
  enemies: readonly CombatUnit[],
): readonly CombatUnit[] {
  const livingHeroes = heroes.filter((h) => !h.isDowned);
  const livingEnemies = enemies.filter((e) => !e.isDowned);

  switch (selector) {
    case 'acting_hero':
      return livingHeroes.filter((h) => h.unitId === actingUnitId);
    case 'frontmost_enemy':
      return selectFrontmost(livingEnemies);
    case 'rearmost_enemy':
      return selectRearmost(livingEnemies);
    case 'all_enemies':
      return livingEnemies;
    case 'lowest_hp_ally':
      return selectLowestHp(livingHeroes);
    case 'all_allies':
      return livingHeroes;
    default:
      throw new Error(`Unknown target selector: ${selector}`);
  }
}

function selectFrontmost(units: readonly CombatUnit[]): readonly CombatUnit[] {
  const front = units.filter((u) => u.formationRank === 'front');
  if (front.length > 0) return [front[0]!];
  if (units.length > 0) return [units[0]!];
  return [];
}

function selectRearmost(units: readonly CombatUnit[]): readonly CombatUnit[] {
  const back = units.filter((u) => u.formationRank === 'back');
  if (back.length > 0) return [back[back.length - 1]!];
  if (units.length > 0) return [units[units.length - 1]!];
  return [];
}

function selectLowestHp(units: readonly CombatUnit[]): readonly CombatUnit[] {
  if (units.length === 0) return [];
  let lowest = units[0]!;
  for (const unit of units) {
    const pct = unit.currentHp / unit.maxHp;
    const lowestPct = lowest.currentHp / lowest.maxHp;
    if (pct < lowestPct) lowest = unit;
  }
  return [lowest];
}

export interface EffectResult {
  damageDealt: { sourceId: string; targetId: string; amount: number }[];
  shieldGained: { targetId: string; amount: number }[];
  healingApplied: { targetId: string; amount: number }[];
}

export function executeEffects(
  effectPlan: readonly { action: string; amount: number; targetSelector: string }[],
  actingUnitId: string,
  heroes: CombatUnit[],
  enemies: CombatUnit[],
): EffectResult {
  const result: EffectResult = {
    damageDealt: [],
    shieldGained: [],
    healingApplied: [],
  };

  for (const effect of effectPlan) {
    const targets = selectTargets(effect.targetSelector, actingUnitId, heroes, enemies);

    for (const target of targets) {
      switch (effect.action) {
        case 'deal_damage': {
          const actualTarget = findUnit(target.unitId, heroes, enemies);
          if (!actualTarget || actualTarget.isDowned) continue;

          let remaining = effect.amount;
          if (actualTarget.shield > 0) {
            const absorbed = Math.min(actualTarget.shield, remaining);
            actualTarget.shield -= absorbed;
            remaining -= absorbed;
          }
          if (remaining > 0) {
            actualTarget.currentHp = Math.max(0, actualTarget.currentHp - remaining);
            if (actualTarget.currentHp === 0) {
              actualTarget.isDowned = true;
            }
          }
          result.damageDealt.push({
            sourceId: actingUnitId,
            targetId: actualTarget.unitId,
            amount: effect.amount,
          });
          break;
        }
        case 'gain_shield': {
          const actualTarget = findUnit(target.unitId, heroes, enemies);
          if (!actualTarget || actualTarget.isDowned) continue;
          actualTarget.shield += effect.amount;
          result.shieldGained.push({ targetId: actualTarget.unitId, amount: effect.amount });
          break;
        }
        case 'heal': {
          const actualTarget = findUnit(target.unitId, heroes, enemies);
          if (!actualTarget || actualTarget.isDowned) continue;
          const healed = Math.min(effect.amount, actualTarget.maxHp - actualTarget.currentHp);
          actualTarget.currentHp += healed;
          result.healingApplied.push({ targetId: actualTarget.unitId, amount: healed });
          break;
        }
        default:
          throw new Error(`Unknown effect action: ${effect.action}`);
      }
    }
  }

  return result;
}

function findUnit(
  unitId: string,
  heroes: readonly CombatUnit[],
  enemies: readonly CombatUnit[],
): CombatUnit | undefined {
  return heroes.find((h) => h.unitId === unitId) ?? enemies.find((e) => e.unitId === unitId);
}

export function executeEnemyAttack(
  attacker: CombatUnit,
  heroes: CombatUnit[],
): EffectResult {
  const result: EffectResult = {
    damageDealt: [],
    shieldGained: [],
    healingApplied: [],
  };

  const targets = selectFrontmost(heroes.filter((h) => !h.isDowned));
  const target = targets[0];
  if (!target) return result;

  const actualTarget = heroes.find((h) => h.unitId === target.unitId);
  if (!actualTarget || actualTarget.isDowned) return result;

  const damage = 10 + (attacker.isBoss ? 5 : 0);
  let remaining = damage;

  if (actualTarget.shield > 0) {
    const absorbed = Math.min(actualTarget.shield, remaining);
    actualTarget.shield -= absorbed;
    remaining -= absorbed;
  }

  if (remaining > 0) {
    actualTarget.currentHp = Math.max(0, actualTarget.currentHp - remaining);
    if (actualTarget.currentHp === 0) {
      actualTarget.isDowned = true;
    }
  }

  result.damageDealt.push({
    sourceId: attacker.unitId,
    targetId: actualTarget.unitId,
    amount: damage,
  });

  return result;
}
