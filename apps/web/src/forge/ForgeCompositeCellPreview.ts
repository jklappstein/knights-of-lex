/** One composite-sheet cell shown in the Forge review preview grid. */

export interface ForgeCompositeCellPreview {

  readonly artifactId: string;

  readonly label: string;

  readonly previewUrl: string | null;

  readonly destinationPath: string;

}
