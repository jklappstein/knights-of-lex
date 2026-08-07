import { describe, expect, it } from 'vitest';
import { buildCompositeCellPreviews } from './forgeCompositeCellPreviews.js';

describe('buildCompositeCellPreviews', () => {
  it('maps labels from composite catalogue cells', () => {
    const previews = buildCompositeCellPreviews(
      ['art_a', 'art_b'],
      ['content/images/ui/buttons/primary_normal.png', 'content/images/ui/buttons/primary_hover.png'],
      {
        artKey: 'composite/ui_buttons/primary',
        assetId: 'kol.gfx.composite.ui_buttons.primary',
        displayName: 'Primary Button States',
        family: 'ui_buttons',
        recipeId: 'kol.ui-button.v1',
        rows: 2,
        cols: 2,
        cellWidth: 160,
        cellHeight: 56,
        cells: [
          { cellId: 'normal', artKey: 'ui/buttons/primary_normal', label: 'primary · normal' },
          { cellId: 'hover', artKey: 'ui/buttons/primary_hover', label: 'primary · hover' },
        ],
        transparentDefault: true,
      },
    );

    expect(previews).toEqual([
      {
        artifactId: 'art_a',
        label: 'primary · normal',
        previewUrl: null,
        destinationPath: 'content/images/ui/buttons/primary_normal.png',
      },
      {
        artifactId: 'art_b',
        label: 'primary · hover',
        previewUrl: null,
        destinationPath: 'content/images/ui/buttons/primary_hover.png',
      },
    ]);
  });
});
