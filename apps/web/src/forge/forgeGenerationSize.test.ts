import { describe, expect, it } from 'vitest';
import { listGfxForgeEntries } from '../gfx/GfxForgeCatalog.js';
import { SURFACE_FORGE_SIZE } from '../gfx/GfxForgeDimensions.js';
import { buildAllForgeAssetSpecs } from './forgeAssetSpecs.js';
import {
  forgeDerivativeSizes,
  generationAspectMatchesTarget,
  isValidForgeGenerationSize,
  resolveForgeGenerationDimensions,
} from './forgeGenerationSize.js';

describe('resolveForgeGenerationDimensions', () => {
  it('prefers 1024² over odd minimum for 256² brand logo', () => {
    const dims = resolveForgeGenerationDimensions(256, 256);
    expect(dims.width).toBe(1024);
    expect(dims.height).toBe(1024);
    expect(isValidForgeGenerationSize(dims.width, dims.height)).toBe(true);
  });

  it('prefers 1024² for 128² item icon', () => {
    const dims = resolveForgeGenerationDimensions(128, 128);
    expect(dims.width).toBe(1024);
    expect(dims.height).toBe(1024);
  });

  it('preserves ~2.86:1 for 160×56 button skin', () => {
    const dims = resolveForgeGenerationDimensions(160, 56);
    expect(isValidForgeGenerationSize(dims.width, dims.height)).toBe(true);
    expect(generationAspectMatchesTarget(dims)).toBe(true);
    expect(dims.width).toBeGreaterThan(dims.height);
  });

  it('finds minimum 3:1 for wide catalogue ratio', () => {
    const dims = resolveForgeGenerationDimensions(300, 100);
    expect(isValidForgeGenerationSize(dims.width, dims.height)).toBe(true);
    expect(generationAspectMatchesTarget(dims)).toBe(true);
    expect(dims.width / dims.height).toBeCloseTo(3, 0);
  });

  it('keeps 1024² when target is already generation size', () => {
    const dims = resolveForgeGenerationDimensions(1024, 1024);
    expect(dims.width).toBe(1024);
    expect(dims.height).toBe(1024);
  });

  it('keeps portrait 1024×2048 surface size', () => {
    const dims = resolveForgeGenerationDimensions(
      SURFACE_FORGE_SIZE.width,
      SURFACE_FORGE_SIZE.height,
    );
    expect(dims.width).toBe(1024);
    expect(dims.height).toBe(2048);
    expect(dims.width / dims.height).toBeCloseTo(0.5);
  });

  it('prefers 1024² when upscaling a small square panel', () => {
    const dims = resolveForgeGenerationDimensions(512, 512);
    expect(dims.width).toBe(1024);
    expect(dims.height).toBe(1024);
  });
});

describe('forgeDerivativeSizes', () => {
  it('returns square target for square assets', () => {
    expect(forgeDerivativeSizes(128, 128)).toEqual([128]);
  });

  it('returns long edge for non-square assets', () => {
    expect(forgeDerivativeSizes(160, 56)).toEqual([160]);
  });
});

describe('catalog-wide forge asset specs', () => {
  it('every gfx entry syncs with valid ratio-preserving generation dimensions', () => {
    const specs = buildAllForgeAssetSpecs(() => 'brief');
    const gfxSpecs = specs.filter(
      (spec) => spec.assetType === 'isolated-object-2d' || spec.assetType === 'composite-sheet',
    );

    expect(gfxSpecs.length).toBe(listGfxForgeEntries().length);

    for (const spec of gfxSpecs) {
      const width = Number(spec.requirements.width);
      const height = Number(spec.requirements.height);
      const targetWidth = Number(spec.metadata.targetWidth);
      const targetHeight = Number(spec.metadata.targetHeight);

      expect(isValidForgeGenerationSize(width, height), spec.logicalKey).toBe(true);
      expect(
        generationAspectMatchesTarget({
          width,
          height,
          targetWidth,
          targetHeight,
        }),
        spec.logicalKey,
      ).toBe(true);
      expect(width, spec.logicalKey).toBeGreaterThanOrEqual(targetWidth);
      expect(height, spec.logicalKey).toBeGreaterThanOrEqual(targetHeight);
    }
  });

  it('menu_main surface syncs as portrait 1024×2048', () => {
    const specs = buildAllForgeAssetSpecs(() => 'brief');
    const menu = specs.find((spec) => spec.metadata.artKey === 'ui/surfaces/menu_main');
    expect(menu?.requirements.width).toBe(1024);
    expect(menu?.requirements.height).toBe(2048);
    expect(menu?.metadata.targetWidth).toBe(1024);
    expect(menu?.metadata.targetHeight).toBe(2048);
  });
});
