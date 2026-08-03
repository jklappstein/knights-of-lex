import { simpleHash } from '@kol/shared-types';
import type { FoundationalSymbol, SymbolCounts, SymbolSetKey, WordEvaluation } from '@kol/shared-types';
import type { GameContentCatalog } from '@kol/content-runtime';
import type { LexiconRuntime } from '@kol/lexicon-runtime';
import type { BoardTile } from '../board/HexBoard.js';
import { lengthScalar, validatePath } from '../board/HexBoard.js';

const SYMBOL_ORDER: readonly FoundationalSymbol[] = ['strike', 'shot', 'spark', 'guard', 'heal'];

function countSymbols(
  path: readonly { combatSymbol: FoundationalSymbol }[],
): SymbolCounts {
  const counts: SymbolCounts = { strike: 0, shot: 0, spark: 0, guard: 0, heal: 0 };
  for (const tile of path) {
    counts[tile.combatSymbol] += 1;
  }
  return counts;
}

function getDistinctSymbolKey(
  counts: SymbolCounts,
  heroSymbols: readonly FoundationalSymbol[],
): { key: SymbolSetKey; recipeSymbolKey: string } {
  const present = heroSymbols.filter((s) => counts[s] > 0);
  const uniqueCount = present.length;

  if (uniqueCount === 1) {
    const sym = present[0];
    if (!sym) throw new Error('Missing symbol');
    return { key: 'pure', recipeSymbolKey: sym };
  }

  if (uniqueCount === 2) {
    const sorted = [...present].sort(
      (a, b) => SYMBOL_ORDER.indexOf(a) - SYMBOL_ORDER.indexOf(b),
    );
    return { key: 'pair', recipeSymbolKey: sorted.join('_') };
  }

  const sorted = [...heroSymbols].sort(
    (a, b) => SYMBOL_ORDER.indexOf(a) - SYMBOL_ORDER.indexOf(b),
  );
  return { key: 'triad', recipeSymbolKey: sorted.join('_') };
}

function findRecipeId(
  catalog: GameContentCatalog,
  key: SymbolSetKey,
  symbolKey: string,
  heroTriadId: string,
): { recipeId: string; moveName: string } {
  if (key === 'pure') {
    const recipeId = `recipe.pure.${symbolKey}`;
    const recipe = catalog.recipes.get(recipeId);
    if (!recipe) throw new Error(`Unknown pure recipe: ${recipeId}`);
    return { recipeId, moveName: recipe.displayName };
  }

  if (key === 'pair') {
    const recipeId = `recipe.pair.${symbolKey}`;
    const recipe = catalog.recipes.get(recipeId);
    if (!recipe) throw new Error(`Unknown pair recipe: ${recipeId}`);
    return { recipeId, moveName: recipe.displayName };
  }

  const recipe = catalog.recipes.get(heroTriadId);
  if (!recipe) throw new Error(`Unknown triad recipe: ${heroTriadId}`);
  return { recipeId: heroTriadId, moveName: recipe.displayName };
}

export function evaluateWord(
  catalog: GameContentCatalog,
  lexicon: LexiconRuntime,
  tiles: readonly BoardTile[],
  path: readonly import('@kol/shared-types').HexCoord[],
  boardRevision: number,
  heroSymbols: readonly FoundationalSymbol[],
  heroTriadId: string,
  skillModifiers: Readonly<Record<string, number>>,
  usedWords: ReadonlySet<string>,
): WordEvaluation | { rejected: true; code: string } {
  const pathValidation = validatePath(path, tiles);
  if (!pathValidation.valid) {
    return { rejected: true, code: pathValidation.code };
  }

  const normalizedWord = lexicon.normalizeWord(pathValidation.letters);
  if (!lexicon.isValidWord(normalizedWord)) {
    return { rejected: true, code: 'UNKNOWN_WORD' };
  }

  if (usedWords.has(normalizedWord)) {
    return { rejected: true, code: 'WORD_ALREADY_USED' };
  }

  const tileMap = new Map(tiles.map((t) => [`${t.coord.q},${t.coord.r}`, t]));
  const pathTiles = path.map((c) => {
    const tile = tileMap.get(`${c.q},${c.r}`);
    if (!tile) throw new Error('Tile not found in path');
    return tile;
  });

  const symbolCounts = countSymbols(pathTiles);
  const { key: distinctSymbolKey, recipeSymbolKey } = getDistinctSymbolKey(symbolCounts, heroSymbols);
  const { recipeId, moveName } = findRecipeId(catalog, distinctSymbolKey, recipeSymbolKey, heroTriadId);

  const recipe = catalog.recipes.get(recipeId);
  if (!recipe) throw new Error(`Recipe not found: ${recipeId}`);

  const scalar = lengthScalar(normalizedWord.length);
  const semanticTags = lexicon.getSemanticTags(normalizedWord);

  const effectPlan = recipe.effects.map((effect) => {
    let amount = 0;
    for (const [sym, count] of Object.entries(symbolCounts) as [FoundationalSymbol, number][]) {
      if (count > 0) {
        amount += count * 10 * effect.baseMultiplier;
      }
    }
    amount *= scalar;

    const modifier = skillModifiers[effect.action] ?? 0;
    amount += modifier;

    if (semanticTags.includes('guard_word') && effect.action === 'gain_shield') {
      amount *= 2;
    }

    return {
      action: effect.action,
      amount: Math.round(amount),
      targetSelector: effect.targetSelector,
    };
  });

  const evaluationDigest = simpleHash(JSON.stringify({ normalizedWord, recipeId, effectPlan }));

  return {
    boardRevision,
    normalizedWord,
    path,
    symbolCounts,
    distinctSymbolKey,
    recipeId,
    moveName,
    lengthScalar: scalar,
    semanticTags,
    effectPlan,
    evaluationDigest,
  };
}
