import { needsForgeArt } from '../forge/forgeArtPromotion.js';

let layoutForcedVisible = false;

/** Dev layout mode — show Gen chips on every anchored art slot, including promoted wire. */
export function isForgeGenChipLayoutForced(): boolean {
  return layoutForcedVisible;
}

export function setForgeGenChipLayoutForced(enabled: boolean): void {
  layoutForcedVisible = enabled;
}

/** Above layout gizmos so Gen chips stay clickable while layout mode is on. */
export const FORGE_CHIP_LAYOUT_DEPTH = 20_100;

export function resolveForgeChipDisplayDepth(baseDepth: number): number {
  return layoutForcedVisible ? FORGE_CHIP_LAYOUT_DEPTH : baseDepth;
}

export function resetForgeGenChipVisibilityForTests(): void {
  layoutForcedVisible = false;
}

export function shouldAttachForgeGenChip(artKey: string): boolean {
  return layoutForcedVisible || needsForgeArt(artKey);
}
