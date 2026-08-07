/** A presentation gfx slot that can be targeted by Zencode Forge generation. */
import type { GfxCompositeSheetGroup } from '../gfx/GfxCompositeCatalog.js';

export interface ForgeGfxTarget {
  readonly artKey: string;
  readonly assetId: string;
  readonly displayName: string;
  readonly family: string;
  readonly compositeGroup?: GfxCompositeSheetGroup;
  /** Inventory instance when opened from a run item. */
  readonly instanceId?: string;
  /** Content slot label for item/mod targets. */
  readonly slot?: string;
}

/** Inventory-specific target — convenience alias for item forge flows. */
export interface ForgeItemTarget extends ForgeGfxTarget {
  readonly instanceId: string;
  readonly itemId: string;
  readonly slot: string;
}
