import { describe, expect, it } from 'vitest';
import { buildGfxAssetSpecs } from './forgeAssetSpecs.js';
import { isValidForgeGenerationSize } from './forgeGenerationSize.js';

describe('forgeAssetSpecs alpha', () => {
  it('honours per-artKey alpha overrides from prefs', () => {
    const specs = buildGfxAssetSpecs(
      (_, fallback) => fallback,
      (artKey) => artKey === 'ui/icons/gold' ? false : true,
    );
    const icon = specs.find((spec) => spec.metadata.artKey === 'ui/icons/gold');
    expect(icon?.requirements.alpha).toBe(false);
  });

  it('builds composite-sheet specs for button state groups', () => {
    const specs = buildGfxAssetSpecs((_, fallback) => fallback);
    const primary = specs.find(
      (spec) => spec.metadata.artKey === 'composite/ui_buttons/primary',
    );
    expect(primary?.assetType).toBe('composite-sheet');
    expect(primary?.recipe).toBe('composite-sheet.v1');
    expect(primary?.requirements.compositeSheet).toMatchObject({
      mode: 'sheetThenSlice',
      rows: 2,
      cols: 2,
      cellWidth: 160,
      cellHeight: 56,
      catalogueSheetWidth: 320,
      catalogueSheetHeight: 112,
    });
    expect(primary?.metadata.targetWidth).toBe(320);
    expect(primary?.metadata.targetHeight).toBe(112);
    const genW = Number(primary?.requirements.width);
    const genH = Number(primary?.requirements.height);
    expect(genW).toBeGreaterThanOrEqual(320);
    expect(genH).toBeGreaterThanOrEqual(112);
    expect(isValidForgeGenerationSize(genW, genH)).toBe(true);
  });

  it('syncs hero 4×4 animation sheets at 2048²', () => {
    const specs = buildGfxAssetSpecs((_, fallback) => fallback);
    const vanguard = specs.find(
      (spec) => spec.metadata.artKey === 'composite/heroes/vanguard',
    );
    expect(vanguard?.assetType).toBe('composite-sheet');
    expect(vanguard?.requirements.compositeSheet).toMatchObject({
      rows: 4,
      cols: 4,
      cellWidth: 512,
      cellHeight: 512,
      catalogueSheetWidth: 2048,
      catalogueSheetHeight: 2048,
      gutterInset: 0,
      stripPlate: false,
    });
    expect(vanguard?.metadata.sheetPromotionArtKey).toBe('heroes/vanguard_sheet');
    expect(vanguard?.metadata.targetWidth).toBe(2048);
    expect(vanguard?.metadata.targetHeight).toBe(2048);
    const genW = Number(vanguard?.requirements.width);
    const genH = Number(vanguard?.requirements.height);
    expect(genW).toBe(2048);
    expect(genH).toBe(2048);
    expect(isValidForgeGenerationSize(genW, genH)).toBe(true);
  });

  it('syncs hex 2×4 variant sheets at native 2048×1024', () => {
    const specs = buildGfxAssetSpecs((_, fallback) => fallback);
    const heal = specs.find(
      (spec) => spec.metadata.artKey === 'composite/hex/heal',
    );
    expect(heal?.assetType).toBe('composite-sheet');
    expect(heal?.requirements.compositeSheet).toMatchObject({
      rows: 2,
      cols: 4,
      cellWidth: 512,
      cellHeight: 512,
      catalogueSheetWidth: 2048,
      catalogueSheetHeight: 1024,
      gutterInset: 0,
      stripPlate: false,
    });
    expect(heal?.metadata.targetWidth).toBe(2048);
    expect(heal?.metadata.targetHeight).toBe(1024);
    const genW = Number(heal?.requirements.width);
    const genH = Number(heal?.requirements.height);
    expect(genW).toBe(2048);
    expect(genH).toBe(1024);
    expect(isValidForgeGenerationSize(genW, genH)).toBe(true);
  });

  it('keeps provider generation size at least catalogue size for all composites', () => {
    const specs = buildGfxAssetSpecs((_, fallback) => fallback).filter(
      (spec) => spec.assetType === 'composite-sheet',
    );
    expect(specs.length).toBeGreaterThan(0);
    for (const spec of specs) {
      const genW = Number(spec.requirements.width);
      const genH = Number(spec.requirements.height);
      const targetW = Number(spec.metadata.targetWidth);
      const targetH = Number(spec.metadata.targetHeight);
      expect(genW, spec.logicalKey).toBeGreaterThanOrEqual(targetW);
      expect(genH, spec.logicalKey).toBeGreaterThanOrEqual(targetH);
      expect(isValidForgeGenerationSize(genW, genH), spec.logicalKey).toBe(true);
    }
  });
});
