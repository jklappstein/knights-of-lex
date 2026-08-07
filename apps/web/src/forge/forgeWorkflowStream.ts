import type { ForgeRecipeId, ForgeRuntimeEvent } from '../ports/ForgePort.js';
import { forgeFetchWithRetry } from './forgeApi.js';
import { mediaKindForRecipe } from './forgeRecipeMapping.js';

const POLL_MS = 1500;
const MAX_POLL_MS = 600_000;
/** Forge worker deadlock / Temporal handoff failures leave workflows in queued indefinitely. */
export const STUCK_QUEUED_MS = 120_000;

const SUCCESS_TERMINAL_STATES = new Set(['awaiting_review', 'completed']);

const FAILURE_TERMINAL_STATES = new Set([
  'failed_terminal',
  'failed_retryable',
  'cancelled',
  'cancel_requested',
]);

interface WorkflowStatus {
  readonly id: string;
  readonly businessState: string;
  readonly lastErrorCode?: string | null;
  readonly result?: Record<string, unknown> | null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === 'string');
}

function cellArtifactIdsFromWorkflow(workflow: WorkflowStatus): string[] {
  const result = workflow.result ?? {};
  return readStringArray(result.cell_artifact_ids ?? result.cellArtifactIds);
}

function previewArtifactIdFromWorkflow(workflow: WorkflowStatus): string | null {
  const result = workflow.result ?? {};
  const explicit = result.preview_artifact_id ?? result.previewArtifactId;
  return typeof explicit === 'string' && explicit ? explicit : null;
}

function artifactIdsFromWorkflow(workflow: WorkflowStatus): string[] {
  const cellIds = cellArtifactIdsFromWorkflow(workflow);
  if (cellIds.length > 0) return cellIds;
  const result = workflow.result ?? {};
  const candidates = [
    result.artifactIds,
    result.artifact_ids,
    result.variantArtifactIds,
    result.variant_artifact_ids,
    result.allArtifactIds,
    result.all_artifact_ids,
  ];
  for (const value of candidates) {
    const ids = readStringArray(value);
    if (ids.length > 0) return ids;
  }
  return [];
}

function workflowFailureDetail(workflow: WorkflowStatus): string {
  const result = workflow.result ?? {};
  const message = result.error_message ?? result.errorMessage;
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }
  return workflow.lastErrorCode ?? workflow.businessState;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

export async function pollWorkflowEvents(
  workflowId: string,
  context: {
    readonly recipeId: ForgeRecipeId;
    readonly destinationPath: string;
    readonly sliceDestinations?: readonly string[];
  },
  onEvent: (event: ForgeRuntimeEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  onEvent({ event: 'workflow.started', data: { executionId: workflowId } });

  const started = Date.now();
  let emittedArtifacts = false;
  let lastReportedState: string | null = null;
  let queuedSince: number | null = null;

  while (Date.now() - started < MAX_POLL_MS) {
    const workflow = await forgeFetchWithRetry<WorkflowStatus>(
      `/workflows/${encodeURIComponent(workflowId)}`,
      signal ? { signal } : {},
    );

    if (workflow.businessState !== lastReportedState) {
      lastReportedState = workflow.businessState;
      onEvent({
        event: 'workflow.progress',
        data: { executionId: workflowId, businessState: workflow.businessState },
      });
    }

    if (workflow.businessState === 'queued') {
      queuedSince ??= Date.now();
      if (Date.now() - queuedSince >= STUCK_QUEUED_MS) {
        throw new Error(
          'Forge workflow stuck in queued — the Temporal worker may be deadlocked. '
          + 'Restart the Forge worker (docker restart compose-worker-1), cancel this run, and try again.',
        );
      }
    } else {
      queuedSince = null;
    }

    if (FAILURE_TERMINAL_STATES.has(workflow.businessState)) {
      throw new Error(`Forge workflow failed: ${workflowFailureDetail(workflow)}`);
    }

    if (!emittedArtifacts && SUCCESS_TERMINAL_STATES.has(workflow.businessState)) {
      const mediaKind = mediaKindForRecipe(context.recipeId);
      const sliceDestinations = context.sliceDestinations;
      const cellIds = cellArtifactIdsFromWorkflow(workflow);

      if (sliceDestinations && sliceDestinations.length > 0) {
        if (cellIds.length !== sliceDestinations.length) {
          throw new Error(
            'Forge composite workflow completed without cell_artifact_ids. '
            + 'Rebuild Forge worker/api and regenerate.',
          );
        }
        const previewArtifactId = previewArtifactIdFromWorkflow(workflow);
        if (!previewArtifactId) {
          throw new Error(
            'Forge composite workflow completed without preview_artifact_id. '
            + 'Rebuild Forge worker/api and regenerate.',
          );
        }
        onEvent({
          event: 'artifact.set.ready',
          data: {
            previewArtifactId,
            cellArtifactIds: cellIds,
            destinationPaths: sliceDestinations,
            batchIndex: 0,
            mediaKind,
          },
        });
      } else {
        const artifactIds = artifactIdsFromWorkflow(workflow);
        artifactIds.forEach((artifactId, batchIndex) => {
          onEvent({
            event: 'artifact.ready',
            data: {
              artifactId,
              batchIndex,
              destinationPath: context.destinationPath,
              mediaKind,
            },
          });
        });
      }
      emittedArtifacts = true;
    }

    if (SUCCESS_TERMINAL_STATES.has(workflow.businessState)) {
      onEvent({ event: 'workflow.completed', data: { executionId: workflowId } });
      return;
    }

    await sleep(POLL_MS, signal);
  }

  throw new Error('Forge workflow polling timed out');
}

export { cellArtifactIdsFromWorkflow, previewArtifactIdFromWorkflow, workflowFailureDetail };
