import type { ForgeReferenceImage } from '../ports/ForgePort.js';

export type { ForgeReferenceImage, ForgeReferenceMode } from '../ports/ForgePort.js';

export const DEFAULT_FORGE_REFERENCE: ForgeReferenceImage = {
  mode: 'none',
  artKey: null,
  dataUrl: null,
  strength: 0.65,
};
