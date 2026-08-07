import type Phaser from 'phaser';
import { ArtResolver } from '../gfx/ArtResolver.js';
import { refreshArtTexturesInScene } from '../gfx/artRefresh.js';
import { sliceSpecForSheetArtKey } from '../gfx/SliceSheetCatalog.js';
import { SliceSheetAnimator } from '../gfx/SliceSheetAnimator.js';

/** Load promoted wire assets into Phaser and refresh on-screen drawables. */
export async function applyPromotedArtToScene(
  scene: Phaser.Scene,
  runtimeKeys: readonly string[],
): Promise<void> {
  if (runtimeKeys.length === 0) return;

  ArtResolver.markWireAvailable(runtimeKeys);

  const imageKeys: string[] = [];
  for (const key of runtimeKeys) {
    try {
      const sliceSpec = sliceSpecForSheetArtKey(key);
      if (sliceSpec) {
        await SliceSheetAnimator.reloadSheet(scene, sliceSpec, { force: true });
      } else {
        imageKeys.push(key);
      }
    } catch (err) {
      console.warn(`[applyPromotedArt] failed for ${key}`, err);
    }
  }

  if (imageKeys.length > 0) {
    try {
      await ArtResolver.reloadWireImages(scene, imageKeys, { force: true });
    } catch (err) {
      console.warn('[applyPromotedArt] wire image reload failed', err);
    }
  }

  try {
    refreshArtTexturesInScene(scene, runtimeKeys);
  } catch (err) {
    console.warn('[applyPromotedArt] texture refresh failed', err);
  }
}
