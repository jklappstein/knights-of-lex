import type { ForgeRecipeId } from '../ports/ForgePort.js';

/** Forge profile key (tools/forge/project.yaml) for a Kol recipe. */
export function profileForRecipe(recipeId: ForgeRecipeId): string {
  switch (recipeId) {
    case 'kol.hero-portrait.v1':
      return 'knights-of-lex.hero-portrait.v1';
    case 'kol.enemy-portrait.v1':
      return 'knights-of-lex.enemy-portrait.v1';
    case 'kol.ui-surface.v1':
      return 'knights-of-lex.ui-surface.v1';
    case 'kol.ui-button.v1':
      return 'knights-of-lex.ui-button.v1';
    case 'kol.ui-icon.v1':
      return 'knights-of-lex.ui-icon.v1';
    case 'kol.hex-tile.v1':
      return 'knights-of-lex.hex-tile.v1';
    case 'kol.brand-logo.v1':
      return 'knights-of-lex.brand-logo.v1';
    case 'kol.sfx.v1':
    case 'kol.music.v1':
      return 'knights-of-lex.audio.v1';
    default:
      return 'knights-of-lex.item-icon.v1';
  }
}

/** Forge workflow recipe ref stored on asset specs. */
export function forgeRecipeRef(recipeId: ForgeRecipeId): string {
  switch (recipeId) {
    case 'kol.sfx.v1':
      return 'sfx.v1';
    case 'kol.music.v1':
      return 'music-cue.v1';
    default:
      return 'isolated-object-2d.v1';
  }
}

/** Forge asset type for sync documents. */
export function forgeAssetType(recipeId: ForgeRecipeId): string {
  switch (recipeId) {
    case 'kol.sfx.v1':
      return 'sfx';
    case 'kol.music.v1':
      return 'music-cue';
    default:
      return 'isolated-object-2d';
  }
}

export function mediaKindForRecipe(recipeId: ForgeRecipeId): 'image' | 'sfx' | 'music' {
  if (recipeId === 'kol.sfx.v1') return 'sfx';
  if (recipeId === 'kol.music.v1') return 'music';
  return 'image';
}
