import type {
  ForgeGenerateRequest,
  ForgeGenerateResult,
  ForgePort,
  ForgeRuntimeEvent,
} from '../ports/ForgePort.js';
import type { ForgeProviderInfo } from './ForgeProviderInfo.js';
import { artContentPathFromKey } from '../gfx/artKeys.js';
import type { GfxCompositeSheetGroup } from '../gfx/GfxCompositeCatalog.js';
import { buildForgeSyncPayload } from './buildForgeSyncPayload.js';
import { ForgeAssetRegistry } from './ForgeAssetRegistry.js';
import { gfxForgeEntryForArtKey } from '../gfx/GfxForgeCatalog.js';
import {
  authHeaders,
  forgeFetch,
  forgeFetchBlob,
  FORGE_API_BASE,
} from './forgeApi.js';
import { FORGE_PROJECT_ID } from './forgeOptions.js';
import { loadAllForgePromptBriefs } from './ForgePromptStore.js';
import { computeSyncFingerprint } from './forgeSyncFingerprint.js';
import { pollWorkflowEvents } from './forgeWorkflowStream.js';
import {
  dismissPendingReview,
  fetchPendingReview,
  type ForgePendingReview,
} from './forgeReviewContext.js';
import {
  findResumableWorkflowForAsset,
  isActiveProductionGenerateError,
} from './forgeActiveWorkflow.js';

function artifactPathForRequest(request: ForgeGenerateRequest): string {

  switch (request.recipeId) {

    case 'kol.sfx.v1':

      return `content/sounds/economy/${request.artKey.replace(/\//g, '_')}.ogg`;

    case 'kol.music.v1':

      return `content/music/overland/${request.artKey.replace(/\//g, '_')}.ogg`;

    default:

      return artContentPathFromKey(request.artKey);

  }

}



async function sha256PrefixedBytes(bytes: ArrayBuffer): Promise<string> {

  const digest = await crypto.subtle.digest('SHA-256', bytes);

  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');

  return `sha256:${hex}`;

}



function arrayBufferToBase64(buffer: ArrayBuffer): string {

  const bytes = new Uint8Array(buffer);

  let binary = '';

  for (let i = 0; i < bytes.length; i += 1) {

    binary += String.fromCharCode(bytes[i]!);

  }

  return btoa(binary);

}



function isReviewPendingGenerateError(err: unknown): boolean {

  const message = err instanceof Error ? err.message : String(err);

  return message.includes('(409)') && message.includes('review_pending');

}



export class HttpForgePort implements ForgePort {

  private readonly previewUrls = new Map<string, string>();

  private readonly registry = new ForgeAssetRegistry();

  private lastSyncedFingerprint: string | null = null;

  private syncInFlight: Promise<void> | null = null;

  private lastContext: {

    readonly request: ForgeGenerateRequest;

    readonly assetSpecId: string;

    readonly compositeGroup?: GfxCompositeSheetGroup;

    readonly workflowId?: string;

  } | null = null;

  private lastWorkflowId: string | null = null;



  async health(): Promise<boolean> {

    try {

      const res = await fetch('/api/forge-healthz', {

        headers: authHeaders(),

        credentials: 'omit',

      });

      return res.ok;

    } catch {

      return false;

    }

  }



  async imageGenerationReady(): Promise<boolean> {

    try {

      const res = await fetch('/api/forge-healthz', {

        headers: authHeaders(),

        credentials: 'omit',

      });

      if (!res.ok) return false;

      const data = await res.json() as { imageGenerationReady?: boolean };

      return data.imageGenerationReady === true;

    } catch {

      return false;

    }

  }



  async sync(): Promise<void> {

    const fingerprint = await computeSyncFingerprint();

    await this.runSync(fingerprint);

  }



  async ensureSynced(requiredLogicalKey?: string): Promise<boolean> {

    if (!(await this.health())) {

      return false;

    }



    if (this.registry.size === 0) {

      await this.registry.refresh();

    }



    const fingerprint = await computeSyncFingerprint();

    const payloadChanged = this.lastSyncedFingerprint !== fingerprint;

    const missingKey = requiredLogicalKey

      ? this.registry.resolveSpecId(requiredLogicalKey) === undefined

      : false;



    if (!payloadChanged && !missingKey && this.registry.size > 0) {

      return false;

    }



    await this.runSync(fingerprint);



    if (requiredLogicalKey && !this.registry.resolveSpecId(requiredLogicalKey)) {

      throw new Error(

        `Asset "${requiredLogicalKey}" is not registered in Forge after sync.`,

      );

    }



    return true;

  }



  async loadPendingReview(request: ForgeGenerateRequest): Promise<ForgePendingReview | null> {

    if (!(await this.health())) {

      return null;

    }



    await this.ensureSynced(request.assetId);

    const assetSpecId = this.registry.resolveSpecId(request.assetId);

    if (!assetSpecId) return null;



    const review = await fetchPendingReview(

      assetSpecId,

      request,

      artifactPathForRequest(request),

    );



    if (review) {

      this.lastContext = { request, assetSpecId };

    }



    return review;

  }



  private async runSync(fingerprint: string): Promise<void> {

    if (this.syncInFlight) {

      await this.syncInFlight;

      return;

    }



    this.syncInFlight = (async () => {

      const promptBriefs = loadAllForgePromptBriefs();

      const payload = await buildForgeSyncPayload(promptBriefs);

      await forgeFetch(`/projects/${FORGE_PROJECT_ID}/syncs`, {

        method: 'POST',

        body: JSON.stringify(payload),

      });

      await this.registry.refresh();

      this.lastSyncedFingerprint = fingerprint;

    })();



    try {

      await this.syncInFlight;

    } finally {

      this.syncInFlight = null;

    }

  }



  private async ensureAssetSpecId(logicalKey: string): Promise<string> {

    await this.ensureSynced(logicalKey);

    const specId = this.registry.resolveSpecId(logicalKey);

    if (!specId) {

      throw new Error(`Asset "${logicalKey}" is not registered in Forge.`);

    }

    return specId;

  }



  async listProviders(): Promise<readonly ForgeProviderInfo[]> {

    const data = await forgeFetch<Array<{

      id: string;

      status?: string;

      kind?: string | null;

      label?: string | null;

      models?: Array<{ id: string; label: string; default?: boolean }>;

      defaultModel?: string | null;

    }>>('/providers');

    return data.map((provider) => ({

      id: provider.id,

      label: provider.label ?? provider.id,

      kind: provider.kind ?? 'generic',

      models: (provider.models ?? []).map((model) => ({

        id: model.id,

        label: model.label,

        ...(model.default ? { default: true } : {}),

      })),

      defaultModel: provider.defaultModel ?? provider.models?.find((m) => m.default)?.id ?? null,

    }));

  }



  async generate(request: ForgeGenerateRequest): Promise<ForgeGenerateResult> {

    const assetSpecId = await this.ensureAssetSpecId(request.assetId);

    const entry = gfxForgeEntryForArtKey(request.artKey);

    this.lastContext = {

      request,

      assetSpecId,

      ...(entry.compositeGroup ? { compositeGroup: entry.compositeGroup } : {}),

    };



    await this.releaseReviewLockIfNeeded(assetSpecId, request);



    const result = await this.startGeneration(assetSpecId, request);

    this.lastWorkflowId = result.executionId;

    this.lastContext = { ...this.lastContext!, workflowId: result.executionId };

    return result;

  }



  private async releaseReviewLockIfNeeded(

    assetSpecId: string,

    request: ForgeGenerateRequest,

  ): Promise<void> {

    const pending = await fetchPendingReview(

      assetSpecId,

      request,

      artifactPathForRequest(request),

    );

    if (!pending || pending.variants.length === 0) {

      return;

    }



    await dismissPendingReview(assetSpecId, pending.variants[0]!.artifactId);

  }



  private async startGeneration(

    assetSpecId: string,

    request: ForgeGenerateRequest,

  ): Promise<ForgeGenerateResult> {

    try {

      return await this.postGenerate(assetSpecId, request);

    } catch (err) {

      if (isActiveProductionGenerateError(err)) {

        const workflowId = await findResumableWorkflowForAsset(assetSpecId);

        if (workflowId) {

          return { executionId: workflowId };

        }

        throw new Error(

          'Generation is already running for this asset. Wait for variants to appear in the stream.',

          { cause: err },

        );

      }

      if (!isReviewPendingGenerateError(err)) {

        throw err;

      }



      const pending = await fetchPendingReview(

        assetSpecId,

        request,

        artifactPathForRequest(request),

      );

      if (!pending || pending.variants.length === 0) {

        throw err;

      }



      await dismissPendingReview(assetSpecId, pending.variants[0]!.artifactId);

      return this.postGenerate(assetSpecId, request);

    }

  }



  private async postGenerate(

    assetSpecId: string,

    request: ForgeGenerateRequest,

  ): Promise<ForgeGenerateResult> {

    const data = await forgeFetch<{ id?: string; temporalWorkflowId?: string }>(

      `/assets/${encodeURIComponent(assetSpecId)}/generate`,

      {

        method: 'POST',

        body: JSON.stringify({

          provider: request.provider,

          model: request.model,

          requestedBy: 'knights-of-lex-web',

          lane: 'interactive',

          idempotencyKey: `${assetSpecId}:${request.provider}:${request.model}:${Date.now()}`,

        }),

      },

    );



    const executionId = data.id ?? data.temporalWorkflowId;

    if (!executionId) {

      throw new Error('Forge generate response missing workflow id');

    }



    return {

      executionId,

      ...(data.temporalWorkflowId ? { workflowId: data.temporalWorkflowId } : {}),

    };

  }



  async streamEvents(

    executionId: string,

    onEvent: (event: ForgeRuntimeEvent) => void,

    signal?: AbortSignal,

  ): Promise<void> {

    const context = this.lastContext;

    if (!context) {

      throw new Error('No active Forge generation context');

    }



    const sliceDestinations = this.sliceDestinationsForComposite(context.compositeGroup);

    await pollWorkflowEvents(

      executionId,

      {

        recipeId: context.request.recipeId,

        destinationPath: artifactPathForRequest(context.request),

        ...(sliceDestinations ? { sliceDestinations } : {}),

      },

      onEvent,

      signal,

    );

  }



  private sliceDestinationsForComposite(

    group: GfxCompositeSheetGroup | undefined,

  ): string[] | undefined {

    if (!group) return undefined;

    if (group.sheetPromotionArtKey) {

      const sheetPath = artContentPathFromKey(group.sheetPromotionArtKey);

      return group.cells.map(() => sheetPath);

    }

    return group.cells.map((cell) => artContentPathFromKey(cell.artKey));

  }



  private async resolveCompositeSheetArtifactId(): Promise<string | null> {

    const workflowId = this.lastWorkflowId ?? this.lastContext?.workflowId;

    if (!workflowId) return null;



    const workflow = await forgeFetch<{

      result?: {

        artifact_ids?: string[];

        cell_artifact_ids?: string[];

      };

    }>(`/workflows/${encodeURIComponent(workflowId)}`);



    const cellIds = new Set(workflow.result?.cell_artifact_ids ?? []);

    const candidates = workflow.result?.artifact_ids ?? [];

    for (const candidateId of candidates) {

      if (cellIds.has(candidateId)) continue;

      try {

        const meta = await forgeFetch<{ artifactKind?: string }>(

          `/artifacts/${encodeURIComponent(candidateId)}`,

        );

        if (meta.artifactKind === 'composite-sheet') {

          return candidateId;

        }

      } catch {

        // skip unreadable artifact metadata

      }

    }

    return null;

  }



  async getArtifactPreviewUrl(artifactId: string): Promise<string | null> {

    const cached = this.previewUrls.get(artifactId);

    if (cached) return cached;



    try {

      const blob = await forgeFetchBlob(`/artifacts/${encodeURIComponent(artifactId)}/content`);

      const url = URL.createObjectURL(blob);

      this.previewUrls.set(artifactId, url);

      return url;

    } catch {

      return null;

    }

  }



  async promote(
    artifactId: string,
    destinationPath: string,
    compositeCells?: {
      readonly cellArtifactIds: readonly string[];
      readonly destinationPaths: readonly string[];
    },
  ): Promise<void> {

    const context = this.lastContext;

    if (!context) {

      throw new Error('Promote requires an active generation context. Generate first, then promote.');

    }



    const { assetSpecId, compositeGroup } = context;



    if (compositeGroup?.sheetPromotionArtKey) {

      const kolPath = artContentPathFromKey(compositeGroup.sheetPromotionArtKey);

      await this.promoteSingleArtifact(

        assetSpecId,

        await this.resolveCompositeSheetArtifactId() ?? artifactId,

        kolPath,

        kolPath,

      );

      return;

    }



    if (compositeGroup && !compositeGroup.sheetPromotionArtKey) {
      await this.promoteCompositeCellSet(
        assetSpecId,
        compositeGroup,
        destinationPath,
        compositeCells,
      );
      return;
    }



    await this.promoteSingleArtifact(assetSpecId, artifactId, destinationPath, destinationPath);

  }



  private async promoteCompositeCellSet(
    assetSpecId: string,
    compositeGroup: GfxCompositeSheetGroup,
    compositeDestinationPath: string,
    compositeCells?: {
      readonly cellArtifactIds: readonly string[];
      readonly destinationPaths: readonly string[];
    },
  ): Promise<void> {
    const defaultDestinationPaths = compositeGroup.cells.map((cell) => artContentPathFromKey(cell.artKey));
    let cellIds = compositeCells?.cellArtifactIds ? [...compositeCells.cellArtifactIds] : [];
    let destinationPaths = compositeCells?.destinationPaths
      ? [...compositeCells.destinationPaths]
      : defaultDestinationPaths;

    if (cellIds.length === 0) {
      const workflowId = this.lastWorkflowId ?? this.lastContext?.workflowId;
      if (!workflowId) {
        throw new Error('Promote requires a completed composite workflow');
      }
      const workflow = await forgeFetch<{
        result?: {
          cell_artifact_ids?: string[];
          cellArtifactIds?: string[];
        };
      }>(`/workflows/${encodeURIComponent(workflowId)}`);
      const result = workflow.result ?? {};
      cellIds = [...(result.cell_artifact_ids ?? result.cellArtifactIds ?? [])];
      destinationPaths = defaultDestinationPaths;
    }

    if (cellIds.length === 0 || cellIds.length !== destinationPaths.length) {
      throw new Error(
        'Composite workflow completed without cell_artifact_ids. Rebuild Forge worker/api and regenerate.',
      );
    }



    const reviewArtifactId = await this.resolveCompositeSheetArtifactId() ?? cellIds[0]!;

    await forgeFetch('/reviews', {

      method: 'POST',

      body: JSON.stringify({

        projectId: FORGE_PROJECT_ID,

        assetSpecId,

        artifactId: reviewArtifactId,

        reviewerId: 'knights-of-lex-web',

        decision: 'approved',

      }),

    });



    const promotion = await forgeFetch<{ id: string }>('/promotions', {

      method: 'POST',

      body: JSON.stringify({

        projectId: FORGE_PROJECT_ID,

        assetSpecId,

        artifactId: reviewArtifactId,

        destination: { relativePath: compositeDestinationPath },

        requestedBy: 'knights-of-lex-web',

      }),

    });



    const writtenHashes: Record<string, string> = {};

    for (let index = 0; index < cellIds.length; index += 1) {

      const cellId = cellIds[index]!;

      const dest = destinationPaths[index]!;

      const bytes = await forgeFetchBlob(`/artifacts/${encodeURIComponent(cellId)}/content`);

      const buffer = await bytes.arrayBuffer();

      const dataBase64 = arrayBufferToBase64(buffer);

      const hash = await sha256PrefixedBytes(buffer);

      writtenHashes[dest] = hash;



      const promoteRes = await fetch('/api/kol/promote-art', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ destinationPath: dest, dataBase64 }),

      });

      if (!promoteRes.ok) {

        const text = await promoteRes.text().catch(() => '');

        throw new Error(`Promote failed (${promoteRes.status}): ${text}`);

      }

    }



    await forgeFetch(`/promotions/${encodeURIComponent(promotion.id)}/report`, {

      method: 'POST',

      body: JSON.stringify({

        schemaVersion: 'forge.agent-report.v1',

        agentId: 'knights-of-lex-web',

        projectId: FORGE_PROJECT_ID,

        kind: 'promote',

        status: 'succeeded',

        promotionRequestId: promotion.id,

        destinationPaths,

        writtenHashes,

        validationResults: destinationPaths.map((dest) => ({

          command: 'kol-promote-art',

          passed: true,

          detail: dest,

        })),

        errors: [],

      }),

    });
  }

  private async promoteSingleArtifact(

    assetSpecId: string,

    artifactId: string,

    forgeDestinationPath: string,

    kolDestinationPath: string,

  ): Promise<void> {

    await forgeFetch('/reviews', {

      method: 'POST',

      body: JSON.stringify({

        projectId: FORGE_PROJECT_ID,

        assetSpecId,

        artifactId,

        reviewerId: 'knights-of-lex-web',

        decision: 'approved',

      }),

    });



    const promotion = await forgeFetch<{ id: string }>('/promotions', {

      method: 'POST',

      body: JSON.stringify({

        projectId: FORGE_PROJECT_ID,

        assetSpecId,

        artifactId,

        destination: { relativePath: forgeDestinationPath },

        requestedBy: 'knights-of-lex-web',

      }),

    });



    const bytes = await forgeFetchBlob(`/artifacts/${encodeURIComponent(artifactId)}/content`);

    const buffer = await bytes.arrayBuffer();

    const dataBase64 = arrayBufferToBase64(buffer);

    const hash = await sha256PrefixedBytes(buffer);



    const promoteRes = await fetch('/api/kol/promote-art', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ destinationPath: kolDestinationPath, dataBase64 }),

    });

    if (!promoteRes.ok) {

      const text = await promoteRes.text().catch(() => '');

      throw new Error(`Promote failed (${promoteRes.status}): ${text}`);

    }



    await forgeFetch(`/promotions/${encodeURIComponent(promotion.id)}/report`, {

      method: 'POST',

      body: JSON.stringify({

        schemaVersion: 'forge.agent-report.v1',

        agentId: 'knights-of-lex-web',

        projectId: FORGE_PROJECT_ID,

        kind: 'promote',

        status: 'succeeded',

        promotionRequestId: promotion.id,

        destinationPaths: [kolDestinationPath],

        writtenHashes: { [kolDestinationPath]: hash },

        validationResults: [{ command: 'kol-promote-art', passed: true }],

        errors: [],

      }),

    });

  }

}



export { FORGE_API_BASE };


