import type { ForgeRecipeId } from '../ports/ForgePort.js';
import { DEFAULT_FORGE_REFERENCE } from './ForgeReferenceImage.js';
import { defaultNegativePrompt } from './forgeOptions.js';
import { profileForRecipe } from './forgeRecipeMapping.js';
import { logicalKeyForTestRecipe } from './forgeAssetSpecs.js';

export function buildForgeRequestForRecipe(
  recipeId: ForgeRecipeId,
  assetId?: string,
  artKey?: string,
): import('../ports/ForgePort.js').ForgeGenerateRequest {
  const resolvedAssetId = assetId ?? logicalKeyForTestRecipe(recipeId);
  const resolvedArtKey = artKey ?? (recipeId === 'kol.sfx.v1'
    ? 'item_equip'
    : recipeId === 'kol.music.v1'
      ? 'zedwood_overland'
      : 'items/militia_sword');

  const base = {
    assetId: resolvedAssetId,
    artKey: resolvedArtKey,
    recipeId,
    profileId: profileForRecipe(recipeId),
    negativePrompt: defaultNegativePrompt(),
    provider: 'openai-image' as const,
    model: 'gpt-image-2',
    transparentBackground: true,
    referenceImage: DEFAULT_FORGE_REFERENCE,
  };

  switch (recipeId) {
    case 'kol.sfx.v1':
      return {
        ...base,
        prompt: 'Short UI sword equip sound, cozy fantasy RPG, crisp transient',
        width: 0,
        height: 0,
        batchSize: 1,
      };
    case 'kol.music.v1':
      return {
        ...base,
        prompt: 'Looping cozy SNES fantasy overland travel theme, warm strings, light wood percussion',
        width: 0,
        height: 0,
        batchSize: 1,
      };
    case 'kol.hero-portrait.v1':
      return {
        ...base,
        prompt: 'Hero portrait bust of a sturdy fantasy knight in practical plate, shoulders up, cozy SNES fantasy',
        width: 256,
        height: 256,
        batchSize: 2,
      };
    case 'kol.ui-button.v1':
      return {
        ...base,
        prompt: 'Warm amber filled pill RPG button skin, empty label area, soft bevel, cozy SNES fantasy',
        width: 160,
        height: 56,
        batchSize: 4,
      };
    case 'kol.ui-icon.v1':
      return {
        ...base,
        prompt: 'Flat HUD icon of a stacked gold coin pile, strong silhouette, centered, no text, cozy SNES fantasy',
        width: 64,
        height: 64,
        batchSize: 4,
      };
    case 'kol.hex-tile.v1':
      return {
        ...base,
        prompt: 'Flat-top hexagonal board tile, warm red melee tint, clear center letter area, cozy SNES fantasy',
        width: 96,
        height: 96,
        batchSize: 4,
      };
    case 'kol.brand-logo.v1':
      return {
        ...base,
        prompt: 'Title logo mark for Knights of Lex, heraldic shield with crossed quill and sword, cozy SNES fantasy',
        width: 256,
        height: 256,
        batchSize: 2,
      };
    default:
      return {
        ...base,
        prompt: 'Item icon of a simple militia shortsword, centered, soft rim light, cozy SNES fantasy',
        width: 128,
        height: 128,
        batchSize: 4,
      };
  }
}
