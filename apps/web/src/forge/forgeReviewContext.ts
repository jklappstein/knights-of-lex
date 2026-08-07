import type { ForgeGenerateRequest } from '../ports/ForgePort.js';
import { forgeFetch } from './forgeApi.js';
import { FORGE_PROJECT_ID } from './forgeOptions.js';
import { ForgeAssetRegistry } from './ForgeAssetRegistry.js';
import { mediaKindForRecipe } from './forgeRecipeMapping.js';

export interface ForgePendingVariant {
  readonly artifactId: string;
  readonly batchIndex: number;
  readonly destinationPath: string;
  readonly mediaKind: 'image' | 'sfx' | 'music';
}

export interface ForgePendingReview {
  readonly assetSpecId: string;
  readonly workflowId: string | null;
  readonly variants: readonly ForgePendingVariant[];
  readonly compositeSliceSet?: {
    readonly cellArtifactIds: readonly string[];
    readonly previewArtifactId: string;
  };
}

interface ReviewContextResponse {
  readonly asset?: { readonly lifecycleState?: string } | null;
  readonly workflow?: { readonly id?: string; readonly businessState?: string } | null;
  readonly variants?: readonly { readonly id: string }[];
  readonly suggestedDestination?: { readonly relativePath?: string } | null;
  readonly compositeSliceSet?: {
    readonly cellArtifactIds?: readonly string[];
    readonly previewArtifactId?: string;
  } | null;
}

export async function dismissPendingReview(
  assetSpecId: string,
  artifactId: string,
): Promise<void> {
  await forgeFetch('/reviews', {
    method: 'POST',
    body: JSON.stringify({
      projectId: FORGE_PROJECT_ID,
      assetSpecId,
      artifactId,
      reviewerId: 'knights-of-lex-web',
      decision: 'refinement_requested',
    }),
  });
}

export async function fetchPendingReview(
  assetSpecId: string,
  request: ForgeGenerateRequest,
  destinationPath: string,
): Promise<ForgePendingReview | null> {
  let context: ReviewContextResponse;
  try {
    context = await forgeFetch<ReviewContextResponse>(
      `/assets/${encodeURIComponent(assetSpecId)}/review-context`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('(404)')) return null;
    throw err;
  }

  const lifecycleState = context.asset?.lifecycleState;
  if (lifecycleState && lifecycleState !== 'review_pending') {
    return null;
  }

  const workflowState = context.workflow?.businessState;
  if (workflowState && workflowState !== 'awaiting_review' && workflowState !== 'completed') {
    return null;
  }

  const variantIds = (context.variants ?? []).map((variant) => variant.id).filter(Boolean);
  if (variantIds.length === 0) return null;

  const suggested = context.suggestedDestination?.relativePath?.trim();
  const resolvedDestination = suggested || destinationPath;
  const mediaKind = mediaKindForRecipe(request.recipeId);

  const sliceSet = context.compositeSliceSet;
  const compositeSliceSet =
    sliceSet?.cellArtifactIds && sliceSet.previewArtifactId
      ? {
          cellArtifactIds: sliceSet.cellArtifactIds.filter(Boolean),
          previewArtifactId: sliceSet.previewArtifactId,
        }
      : undefined;

  return {
    assetSpecId,
    workflowId: context.workflow?.id ?? null,
    variants: variantIds.map((artifactId, batchIndex) => ({
      artifactId,
      batchIndex,
      destinationPath: resolvedDestination,
      mediaKind,
    })),
    ...(compositeSliceSet ? { compositeSliceSet } : {}),
  };
}

export async function resolveAssetSpecId(
  registry: ForgeAssetRegistry,
  logicalKey: string,
): Promise<string | undefined> {
  if (registry.size === 0) {
    await registry.refresh();
  }
  return registry.resolveSpecId(logicalKey);
}

export { FORGE_PROJECT_ID };
