import { artContentPathFromKey } from '../gfx/artKeys.js';
import type {
  ForgeGenerateRequest,
  ForgeGenerateResult,
  ForgePort,
  ForgeRuntimeEvent,
} from '../ports/ForgePort.js';
import type { ForgeProviderInfo } from './ForgeProviderInfo.js';
import { OFFLINE_FORGE_PROVIDERS } from './forgeProviderPolicy.js';

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

/** Offline-safe Forge port that simulates realtime SSE when the control plane is unavailable. */
export class StubForgePort implements ForgePort {
  private lastRequest: ForgeGenerateRequest | null = null;

  async health(): Promise<boolean> {
    return false;
  }

  async imageGenerationReady(): Promise<boolean> {
    return false;
  }

  async sync(): Promise<void> {
    // no-op
  }

  async ensureSynced(_requiredLogicalKey?: string): Promise<boolean> {
    return false;
  }

  async loadPendingReview(_request: ForgeGenerateRequest): Promise<import('./forgeReviewContext.js').ForgePendingReview | null> {
    return null;
  }

  async listProviders(): Promise<readonly ForgeProviderInfo[]> {
    return OFFLINE_FORGE_PROVIDERS;
  }

  async generate(request: ForgeGenerateRequest): Promise<ForgeGenerateResult> {
    this.lastRequest = request;
    return {
      executionId: `stub:${request.recipeId}:${request.assetId}:${Date.now()}`,
      workflowId: 'stub-workflow',
    };
  }

  async streamEvents(
    executionId: string,
    onEvent: (event: ForgeRuntimeEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const request = this.lastRequest;
    const destinationPath = request
      ? artifactPathForRequest(request)
      : artContentPathFromKey('items/stub');
    const batchSize = Math.max(1, request?.batchSize ?? 1);
    const mediaKind = request?.recipeId === 'kol.sfx.v1'
      ? 'sfx'
      : request?.recipeId === 'kol.music.v1'
        ? 'music'
        : 'image';

    const steps: ForgeRuntimeEvent[] = [
      { event: 'workflow.started', data: { executionId } },
      { event: 'activity.started', data: { name: 'compose_prompt' } },
      { event: 'activity.completed', data: { name: 'compose_prompt' } },
      { event: 'activity.started', data: { name: 'provider_submit' } },
      { event: 'provider.progress', data: { percent: 35 } },
      { event: 'provider.progress', data: { percent: 72 } },
      { event: 'activity.completed', data: { name: 'provider_submit' } },
    ];

    for (let i = 0; i < batchSize; i += 1) {
      steps.push({
        event: 'artifact.ready',
        data: {
          artifactId: `stub-artifact-${executionId}-${i}`,
          batchIndex: i,
          previewMode: 'placeholder',
          destinationPath,
          recipeId: request?.recipeId ?? 'unknown',
          mediaKind,
        },
      });
    }

    steps.push({ event: 'workflow.completed', data: { executionId } });

    for (const step of steps) {
      if (signal?.aborted) return;
      await new Promise((r) => setTimeout(r, 80));
      onEvent(step);
    }
  }

  async getArtifactPreviewUrl(artifactId: string): Promise<string | null> {
    void artifactId;
    return null;
  }

  async promote(
    artifactId: string,
    destinationPath: string,
    _compositeCells?: {
      readonly cellArtifactIds: readonly string[];
      readonly destinationPaths: readonly string[];
    },
  ): Promise<void> {
    void artifactId;
    void destinationPath;
  }
}
