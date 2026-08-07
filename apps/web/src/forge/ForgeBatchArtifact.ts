import type { ForgeCompositeCellPreview } from './ForgeCompositeCellPreview.js';

/** One generated candidate in a multi-version batch. */

export interface ForgeBatchArtifact {
  readonly artifactId: string;

  readonly batchIndex: number;

  readonly previewUrl: string | null;

  readonly destinationPath: string | null;

  readonly mediaKind: string;

  /** Composite slice set — promote all cells to destinationPaths together. */

  readonly cellArtifactIds?: readonly string[];

  readonly destinationPaths?: readonly string[];

  /** Per-cell previews for composite slice sets (matted + trimmed cells). */

  readonly cellPreviews?: readonly ForgeCompositeCellPreview[];

}
