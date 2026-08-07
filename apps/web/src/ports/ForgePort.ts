export type ForgeRecipeId =
  | 'kol.item-icon.v1'
  | 'kol.hero-portrait.v1'
  | 'kol.enemy-portrait.v1'
  | 'kol.ui-surface.v1'
  | 'kol.ui-button.v1'
  | 'kol.ui-icon.v1'
  | 'kol.hex-tile.v1'
  | 'kol.brand-logo.v1'
  | 'kol.sfx.v1'
  | 'kol.music.v1';

export type ForgeProviderId = string;

export type ForgeReferenceMode = 'none' | 'artKey' | 'upload';

export interface ForgeReferenceImage {
  readonly mode: ForgeReferenceMode;
  readonly artKey: string | null;
  readonly dataUrl: string | null;
  /** Provider influence weight 0–1. */
  readonly strength: number;
}

/**
 * Local generate context. Forge `POST /assets/{id}/generate` only accepts
 * provider/model (plus lane metadata) — recipe/profile/size live on the synced spec.
 */
export interface ForgeGenerateRequest {
  readonly assetId: string;
  readonly artKey: string;
  /** Kol recipe id — derived from artKey; used for provider policy, not the generate body. */
  readonly recipeId: ForgeRecipeId;
  readonly profileId: string;
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly provider: ForgeProviderId;
  readonly model: string;
  /** Catalogue / in-game target size (synced via asset requirements, not generate body). */
  readonly width: number;
  readonly height: number;
  /** Stub / local variant count hint; live Forge uses synced `requirements.variantCount`. */
  readonly batchSize: number;
  readonly transparentBackground: boolean;
  readonly referenceImage: ForgeReferenceImage;
}

export interface ForgeRuntimeEvent {
  readonly id?: string;
  readonly event: string;
  readonly data: unknown;
}

export interface ForgeGenerateResult {
  readonly executionId: string;
  readonly workflowId?: string;
}

import type { ForgeProviderInfo } from '../forge/ForgeProviderInfo.js';
import type { ForgePendingReview } from '../forge/forgeReviewContext.js';

/**
 * Host-side Zencode Forge control plane.
 * Consumer guide: docs/integrations/zencode-forge.md
 */
export interface ForgePort {
  health(): Promise<boolean>;
  /** True when Forge API reports openai-image is registered for generation. */
  imageGenerationReady(): Promise<boolean>;
  sync(): Promise<void>;
  /** Sync when catalogue, prompts, or Forge registry are stale. Returns true if a sync ran. */
  ensureSynced(requiredLogicalKey?: string): Promise<boolean>;
  /** Load awaiting-review variants for an asset (survives page refresh). */
  loadPendingReview(request: ForgeGenerateRequest): Promise<ForgePendingReview | null>;
  listProviders(): Promise<readonly ForgeProviderInfo[]>;
  generate(request: ForgeGenerateRequest): Promise<ForgeGenerateResult>;
  streamEvents(
    executionId: string,
    onEvent: (event: ForgeRuntimeEvent) => void,
    signal?: AbortSignal,
  ): Promise<void>;
  getArtifactPreviewUrl(artifactId: string): Promise<string | null>;
  promote(
    artifactId: string,
    destinationPath: string,
    compositeCells?: {
      readonly cellArtifactIds: readonly string[];
      readonly destinationPaths: readonly string[];
    },
  ): Promise<void>;
}
