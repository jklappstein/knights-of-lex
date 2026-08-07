import type { GfxCompositeSheetGroup } from '../gfx/GfxCompositeCatalog.js';
import type { ForgeCompositeCellPreview } from './ForgeCompositeCellPreview.js';

export function buildCompositeCellPreviews(
  cellArtifactIds: readonly string[],
  destinationPaths: readonly string[],
  compositeGroup: GfxCompositeSheetGroup | undefined,
): ForgeCompositeCellPreview[] {
  return cellArtifactIds.map((artifactId, index) => {
    const cell = compositeGroup?.cells[index];
    const destinationPath = destinationPaths[index] ?? '';
    return {
      artifactId,
      label: cell?.label ?? destinationPath.split('/').pop() ?? `Cell ${index + 1}`,
      previewUrl: null,
      destinationPath,
    };
  });
}
