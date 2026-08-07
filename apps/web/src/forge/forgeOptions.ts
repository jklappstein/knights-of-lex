import type { ForgeGenerateRequest } from '../ports/ForgePort.js';
import {
  buildForgeRequestForGfxEntry,
  gfxForgeEntryForArtKey,
  type GfxForgeEntry,
} from '../gfx/GfxForgeCatalog.js';

export const FORGE_PROJECT_ID = 'knights-of-lex';
export const FORGE_DEFAULT_PROFILE = 'knights-of-lex.item-icon.v1';

export function defaultPromptForItem(displayName: string, slot: string): string {
  return [
    `Item icon of "${displayName}"`,
    `${slot} gear`,
    'cozy SNES fantasy',
    'single object centered, soft rim light, readable silhouette, no text',
  ].join(', ');
}

export function defaultNegativePrompt(): string {
  return 'text, watermark, logo, blurry, photorealistic, modern, UI chrome, border frame';
}

export function buildDefaultForgeRequest(input: {
  assetId: string;
  artKey: string;
  displayName: string;
  slot: string;
}): ForgeGenerateRequest {
  const entry: GfxForgeEntry = {
    ...gfxForgeEntryForArtKey(input.artKey),
    assetId: input.assetId,
    displayName: input.displayName,
  };
  return buildForgeRequestForGfxEntry(entry);
}

export function buildDefaultForgeRequestForArtKey(artKey: string): ForgeGenerateRequest {
  return buildForgeRequestForGfxEntry(gfxForgeEntryForArtKey(artKey));
}
