import { describe, expect, it } from 'vitest';
import { compositeForgeArtKey } from '../gfx/GfxCompositeCatalog.js';
import { ArtResolver } from '../gfx/ArtResolver.js';
import { buttonArtKey } from '../gfx/VisualRegistry.js';
import {
  forgeTargetArtKeyForRuntime,
  kolPromotionDestForTarget,
  needsForgeArt,
  runtimeArtKeysForPromote,
} from './forgeArtPromotion.js';
import type { ForgeGfxTarget } from './ForgeGfxTarget.js';

describe('forgeArtPromotion', () => {
  it('needs forge when art availability is unknown or false', () => {
    expect(needsForgeArt('heroes/unprobed_test_asset')).toBe(true);
  });

  it('needs forge for composite cell members until the cell wire exists', () => {
    ArtResolver.markWireAvailable([compositeForgeArtKey('map_nodes/all')]);
    expect(needsForgeArt('map/nodes/town')).toBe(true);
    ArtResolver.markWireAvailable(['map/nodes/town']);
    expect(needsForgeArt('map/nodes/town')).toBe(false);
    ArtResolver.resetCacheForTests();
  });

  it('maps composite slice members to composite forge targets', () => {
    const cellKey = buttonArtKey('primary', 'normal');
    expect(forgeTargetArtKeyForRuntime(cellKey)).toBe(compositeForgeArtKey('ui_buttons/primary'));
    expect(forgeTargetArtKeyForRuntime('map/nodes/town')).toBe(compositeForgeArtKey('map_nodes/all'));
  });

  it('maps item portraits to item composite sheets', () => {
    expect(forgeTargetArtKeyForRuntime('items/militia_sword')).toBe(
      compositeForgeArtKey('items/militia_sword'),
    );
  });

  it('resolves promotion paths and runtime keys for composite targets', () => {
    const target: ForgeGfxTarget = {
      artKey: compositeForgeArtKey('ui_buttons/primary'),
      assetId: 'kol.gfx.composite.ui_buttons.primary',
      displayName: 'Primary Button States',
      family: 'ui_buttons',
      compositeGroup: {
        artKey: compositeForgeArtKey('ui_buttons/primary'),
        assetId: 'kol.gfx.composite.ui_buttons.primary',
        displayName: 'Primary Button States',
        family: 'ui_buttons',
        recipeId: 'kol.ui-button.v1',
        rows: 2,
        cols: 2,
        cellWidth: 160,
        cellHeight: 56,
        cells: [
          { cellId: 'normal', artKey: buttonArtKey('primary', 'normal'), label: 'normal' },
        ],
        transparentDefault: true,
      },
    };
    expect(kolPromotionDestForTarget(target)).toBe('content/images/composite/ui_buttons/primary.png');
    expect(runtimeArtKeysForPromote(target)).toContain(buttonArtKey('primary', 'normal'));
  });
});
