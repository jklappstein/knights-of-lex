import soundsManifest from '../../../../content/audio/sounds.json';
import musicManifest from '../../../../content/audio/music.json';
import { artContentPathFromKey } from '../gfx/artKeys.js';
import {
  defaultDimensionsForRecipe,
  defaultPromptForGfxEntry,
  gfxForgeAssetId,
  listGfxForgeEntries,
  transparentDefaultForRecipe,
  type GfxForgeEntry,
} from '../gfx/GfxForgeCatalog.js';
import type { GfxCompositeSheetGroup } from '../gfx/GfxCompositeCatalog.js';
import { defaultPromptForMusic, defaultPromptForSfx } from '../gfx/GfxForgePrompts.js';
import type { ForgeRecipeId } from '../ports/ForgePort.js';
import { FORGE_PROJECT_ID } from './forgeOptions.js';
import { forgeAssetType, forgeRecipeRef, profileForRecipe } from './forgeRecipeMapping.js';
import {
  forgeDerivativeSizes,
  resolveForgeGenerationDimensions,
} from './forgeGenerationSize.js';

export interface ForgeAssetSpecDocument {
  readonly schemaVersion: 'forge.asset.v1';
  readonly projectId: string;
  readonly logicalKey: string;
  readonly assetType: string;
  readonly consumer: {
    readonly kind: string;
    readonly id: string;
    readonly field: string;
  };
  readonly recipe: string;
  readonly profile: string;
  readonly requirements: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
}

function gfxAssetSpec(
  entry: GfxForgeEntry,
  brief: string,
  alpha: boolean,
): ForgeAssetSpecDocument {
  if (entry.compositeGroup) {
    return compositeGfxAssetSpec(entry, brief, alpha);
  }
  const generation = resolveForgeGenerationDimensions(entry.width, entry.height);
  return {
    schemaVersion: 'forge.asset.v1',
    projectId: FORGE_PROJECT_ID,
    logicalKey: entry.assetId,
    assetType: forgeAssetType(entry.recipeId),
    consumer: {
      kind: 'gfx',
      id: entry.artKey,
      field: 'image',
    },
    recipe: forgeRecipeRef(entry.recipeId),
    profile: profileForRecipe(entry.recipeId),
    requirements: {
      width: generation.width,
      height: generation.height,
      alpha,
      variantCount: 4,
      derivatives: forgeDerivativeSizes(generation.targetWidth, generation.targetHeight),
    },
    metadata: {
      brief,
      path: artContentPathFromKey(entry.artKey),
      artKey: entry.artKey,
      kolRecipeId: entry.recipeId,
      targetWidth: generation.targetWidth,
      targetHeight: generation.targetHeight,
    },
  };
}

/**
 * Composite-sheet sync: two sizes on one asset.
 * - requirements.width/height = provider generation (may upscale for gpt-image-2)
 * - compositeSheet.cellWidth/Height + catalogueSheet* = in-game / promotion layout
 * See docs/integrations/zencode-forge.md § Composite sheet sizing.
 * Do not mirror isolated-object `derivatives` here (those are square max-edge thumbs).
 */
function compositeSheetLayoutForGroup(group: GfxCompositeSheetGroup): {
  gutterInset: number;
  stripPlate: boolean;
} {
  if (group.cellWidth >= 256) {
    return { gutterInset: 0, stripPlate: false };
  }
  return { gutterInset: 6, stripPlate: true };
}

function compositeGfxAssetSpec(
  entry: GfxForgeEntry,
  brief: string,
  alpha: boolean,
): ForgeAssetSpecDocument {
  const group = entry.compositeGroup!;
  const sheetWidth = group.cols * group.cellWidth;
  const sheetHeight = group.rows * group.cellHeight;
  const generation = resolveForgeGenerationDimensions(sheetWidth, sheetHeight);
  const sheetLayout = compositeSheetLayoutForGroup(group);
  const promotionPath = group.sheetPromotionArtKey
    ? artContentPathFromKey(group.sheetPromotionArtKey)
    : artContentPathFromKey(entry.artKey);
  return {
    schemaVersion: 'forge.asset.v1',
    projectId: FORGE_PROJECT_ID,
    logicalKey: entry.assetId,
    assetType: 'composite-sheet',
    consumer: {
      kind: 'gfx',
      id: entry.artKey,
      field: 'compositeSheet',
    },
    recipe: 'composite-sheet.v1',
    profile: profileForRecipe(entry.recipeId),
    requirements: {
      alpha,
      variantCount: 1,
      width: generation.width,
      height: generation.height,
      compositeSheet: {
        mode: 'sheetThenSlice',
        rows: group.rows,
        cols: group.cols,
        cellWidth: group.cellWidth,
        cellHeight: group.cellHeight,
        cells: group.cells.map((cell) => ({ id: cell.cellId, label: cell.label })),
        gutterInset: sheetLayout.gutterInset,
        stripPlate: sheetLayout.stripPlate,
        catalogueSheetWidth: sheetWidth,
        catalogueSheetHeight: sheetHeight,
      },
    },
    metadata: {
      brief,
      path: promotionPath,
      artKey: entry.artKey,
      kolRecipeId: entry.recipeId,
      sheetPromotionArtKey: group.sheetPromotionArtKey,
      sliceArtKeys: Object.fromEntries(group.cells.map((cell) => [cell.cellId, cell.artKey])),
      targetWidth: sheetWidth,
      targetHeight: sheetHeight,
    },
  };
}

function sfxLogicalKey(soundId: string): string {
  return `kol.sfx.${soundId}`;
}

function musicLogicalKey(slotKey: string): string {
  return `kol.music.${slotKey}`;
}

function sfxAssetSpec(
  sound: { id: string; category: string; fileKey: string },
  brief: string,
): ForgeAssetSpecDocument {
  const logicalKey = sfxLogicalKey(sound.id);
  return {
    schemaVersion: 'forge.asset.v1',
    projectId: FORGE_PROJECT_ID,
    logicalKey,
    assetType: 'sfx',
    consumer: {
      kind: sound.category,
      id: sound.id,
      field: 'sfx',
    },
    recipe: 'sfx.v1',
    profile: profileForRecipe('kol.sfx.v1'),
    requirements: {
      durationMs: [120, 180],
      format: 'ogg',
      variantCount: 3,
    },
    metadata: {
      brief,
      path: `content/sounds/${sound.category}/${sound.fileKey}.ogg`,
      kolRecipeId: 'kol.sfx.v1',
    },
  };
}

function musicAssetSpec(
  slot: { key: string; path: string },
  brief: string,
): ForgeAssetSpecDocument {
  const logicalKey = musicLogicalKey(slot.key);
  return {
    schemaVersion: 'forge.asset.v1',
    projectId: FORGE_PROJECT_ID,
    logicalKey,
    assetType: 'music-cue',
    consumer: {
      kind: 'music',
      id: slot.key,
      field: 'cue',
    },
    recipe: 'music-cue.v1',
    profile: profileForRecipe('kol.music.v1'),
    requirements: {
      durationMs: 30_000,
      format: 'ogg',
    },
    metadata: {
      brief,
      path: slot.path,
      kolRecipeId: 'kol.music.v1',
    },
  };
}

export function buildGfxAssetSpecs(
  briefForArtKey: (artKey: string, fallback: string) => string,
  alphaForArtKey?: (artKey: string, recipeId: ForgeRecipeId) => boolean,
): ForgeAssetSpecDocument[] {
  return listGfxForgeEntries().map((entry) => {
    const fallback = defaultPromptForGfxEntry(entry);
    const alpha = alphaForArtKey
      ? alphaForArtKey(entry.artKey, entry.recipeId)
      : transparentDefaultForRecipe(entry.recipeId);
    return gfxAssetSpec(entry, briefForArtKey(entry.artKey, fallback), alpha);
  });
}

export function buildAudioAssetSpecs(
  briefForLogicalKey: (logicalKey: string, fallback: string) => string,
): ForgeAssetSpecDocument[] {
  const specs: ForgeAssetSpecDocument[] = [];

  for (const sound of soundsManifest.sounds) {
    const logicalKey = sfxLogicalKey(sound.id);
    const fallback = defaultPromptForSfx(sound.id);
    specs.push(sfxAssetSpec(sound, briefForLogicalKey(logicalKey, fallback)));
  }

  for (const slot of musicManifest.slots) {
    const logicalKey = musicLogicalKey(slot.key);
    const fallback = defaultPromptForMusic(slot.key);
    specs.push(musicAssetSpec(slot, briefForLogicalKey(logicalKey, fallback)));
  }

  return specs;
}

export function buildAllForgeAssetSpecs(
  briefResolver: (logicalKey: string, fallback: string) => string,
  alphaPrefs: Readonly<Record<string, boolean>> = {},
): ForgeAssetSpecDocument[] {
  return [
    ...buildGfxAssetSpecs((artKey, fallback) => {
      const logicalKey = gfxForgeAssetId(artKey);
      return briefResolver(logicalKey, fallback);
    }, (artKey, recipeId) => {
      const logicalKey = gfxForgeAssetId(artKey);
      if (logicalKey in alphaPrefs) {
        return alphaPrefs[logicalKey]!;
      }
      return transparentDefaultForRecipe(recipeId);
    }),
    ...buildAudioAssetSpecs(briefResolver),
  ];
}

export function defaultDimensionsForForgeRecipe(recipeId: ForgeRecipeId): {
  width: number;
  height: number;
} {
  return defaultDimensionsForRecipe(recipeId);
}

export function logicalKeyForTestRecipe(recipeId: ForgeRecipeId): string {
  switch (recipeId) {
    case 'kol.sfx.v1':
      return sfxLogicalKey('item_equip');
    case 'kol.music.v1':
      return musicLogicalKey('zedwood_overland');
    default:
      return gfxForgeAssetId('items/militia_sword');
  }
}
