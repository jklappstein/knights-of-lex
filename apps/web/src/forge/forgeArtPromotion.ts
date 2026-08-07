import { ArtResolver } from '../gfx/ArtResolver.js';
import type { GfxCompositeSheetGroup } from '../gfx/GfxCompositeCatalog.js';
import { compositeForgeArtKey, gfxCompositeGroupForRuntimeArtKey } from '../gfx/GfxCompositeCatalog.js';import { artContentPathFromKey } from '../gfx/artKeys.js';
import { sliceSheetForArtKey } from '../gfx/SliceSheetCatalog.js';
import type { ForgeGfxTarget } from './ForgeGfxTarget.js';
import { promotionPathForArtKey } from './createForgePort.js';

/** True when promoted wire art is missing (placeholder or unloaded). */
export function needsForgeArt(artKey: string): boolean {
  const sliceSpec = sliceSheetForArtKey(artKey);
  if (sliceSpec) {
    return ArtResolver.isKnownAvailable(sliceSpec.sheetArtKey) !== true;
  }
  const group = gfxCompositeGroupForRuntimeArtKey(artKey);
  if (group?.cells.some((cell) => cell.artKey === artKey)) {
    return ArtResolver.isKnownAvailable(artKey) !== true;
  }
  return ArtResolver.isKnownAvailable(artKey) !== true;
}

/** Forge browser target for a runtime artKey (composite sheet root when applicable). */
export function forgeTargetArtKeyForRuntime(artKey: string): string {
  const group = gfxCompositeGroupForRuntimeArtKey(artKey);
  if (group) return group.artKey;

  const sliceSpec = sliceSheetForArtKey(artKey);
  if (sliceSpec) {
    const itemSuffix = artKey.split('/').pop() ?? artKey;
    return compositeForgeArtKey(`items/${itemSuffix}`);
  }

  return artKey;
}

/** Runtime artKeys written and displayed after a promote action. */
export function runtimeArtKeysForPromote(target: ForgeGfxTarget): readonly string[] {
  if (target.compositeGroup?.sheetPromotionArtKey) {
    return [target.compositeGroup.sheetPromotionArtKey];
  }
  if (target.compositeGroup) {
    return target.compositeGroup.cells.map((cell) => cell.artKey);
  }
  return [target.artKey];
}

/** Repo content path used for the Forge promotion record. */
export function kolPromotionDestForTarget(target: ForgeGfxTarget): string {
  if (target.compositeGroup?.sheetPromotionArtKey) {
    return artContentPathFromKey(target.compositeGroup.sheetPromotionArtKey);
  }
  return promotionPathForArtKey(target.artKey);
}

/** Best artKey to show in the forge preview panel for a target. */
export function previewArtKeyForTarget(target: ForgeGfxTarget): string {
  if (target.compositeGroup?.sheetPromotionArtKey) {
    return target.compositeGroup.sheetPromotionArtKey;
  }
  if (target.compositeGroup?.cells[0]) {
    return target.compositeGroup.cells[0].artKey;
  }
  return target.artKey;
}

export function isSheetCompositeGroup(group: GfxCompositeSheetGroup): boolean {
  return group.sheetPromotionArtKey !== undefined;
}
