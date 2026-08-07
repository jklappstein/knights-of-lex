import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ForgeRuntimeEvent } from '../ports/ForgePort.js';

const forgeFetchWithRetry = vi.fn();

vi.mock('./forgeApi.js', () => ({
  forgeFetchWithRetry: (...args: unknown[]) => forgeFetchWithRetry(...args),
}));

import {
  cellArtifactIdsFromWorkflow,
  pollWorkflowEvents,
  previewArtifactIdFromWorkflow,
  workflowFailureDetail,
} from './forgeWorkflowStream.js';

describe('forgeWorkflowStream helpers', () => {
  it('reads cell artifact ids from workflow result', () => {
    const ids = cellArtifactIdsFromWorkflow({
      id: 'wfr_1',
      businessState: 'awaiting_review',
      result: {
        cell_artifact_ids: ['art_cell_a', 'art_cell_b'],
        preview_artifact_id: 'art_contact',
      },
    });
    expect(ids).toEqual(['art_cell_a', 'art_cell_b']);
  });

  it('reads preview artifact id only when explicitly set', () => {
    expect(
      previewArtifactIdFromWorkflow({
        id: 'wfr_1',
        businessState: 'awaiting_review',
        result: { preview_artifact_id: 'art_contact' },
      }),
    ).toBe('art_contact');
    expect(
      previewArtifactIdFromWorkflow({
        id: 'wfr_1',
        businessState: 'awaiting_review',
        result: { artifact_ids: ['art_sheet', 'art_cell_a'] },
      }),
    ).toBeNull();
  });

  it('reads workflow failure detail from result.error_message', () => {
    expect(
      workflowFailureDetail({
        id: 'wfr_1',
        businessState: 'failed_terminal',
        lastErrorCode: 'workflow_failed',
        result: { error_message: 'RuntimeError: Unknown image provider: openai-image' },
      }),
    ).toBe('RuntimeError: Unknown image provider: openai-image');
  });
});

describe('pollWorkflowEvents', () => {
  beforeEach(() => {
    forgeFetchWithRetry.mockReset();
  });

  it('surfaces failed composite workflows with the worker error', async () => {
    forgeFetchWithRetry.mockResolvedValueOnce({
      id: 'wfr_failed',
      businessState: 'failed_terminal',
      lastErrorCode: 'workflow_failed',
      result: { error_message: 'RuntimeError: Unknown image provider: openai-image' },
    });

    const events: ForgeRuntimeEvent[] = [];
    await expect(
      pollWorkflowEvents(
        'wfr_failed',
        {
          recipeId: 'kol.hex-tile.v1',
          destinationPath: 'content/images/composite/hex/guard.png',
          sliceDestinations: ['content/images/hex/guard/base.png'],
        },
        (event) => events.push(event),
      ),
    ).rejects.toThrow('Forge workflow failed: RuntimeError: Unknown image provider: openai-image');

    expect(events).toEqual([
      { event: 'workflow.started', data: { executionId: 'wfr_failed' } },
      {
        event: 'workflow.progress',
        data: { executionId: 'wfr_failed', businessState: 'failed_terminal' },
      },
    ]);
  });

  it('emits composite artifact.set.ready on successful awaiting_review', async () => {
    forgeFetchWithRetry.mockResolvedValueOnce({
      id: 'wfr_ok',
      businessState: 'awaiting_review',
      result: {
        cell_artifact_ids: ['art_cell_a', 'art_cell_b'],
        preview_artifact_id: 'art_contact',
      },
    });

    const events: ForgeRuntimeEvent[] = [];
    await pollWorkflowEvents(
      'wfr_ok',
      {
        recipeId: 'kol.hex-tile.v1',
        destinationPath: 'content/images/composite/hex/guard.png',
        sliceDestinations: [
          'content/images/hex/guard/base.png',
          'content/images/hex/guard/trace.png',
        ],
      },
      (event) => events.push(event),
    );

    expect(events).toEqual([
      { event: 'workflow.started', data: { executionId: 'wfr_ok' } },
      {
        event: 'workflow.progress',
        data: { executionId: 'wfr_ok', businessState: 'awaiting_review' },
      },
      {
        event: 'artifact.set.ready',
        data: {
          previewArtifactId: 'art_contact',
          cellArtifactIds: ['art_cell_a', 'art_cell_b'],
          destinationPaths: [
            'content/images/hex/guard/base.png',
            'content/images/hex/guard/trace.png',
          ],
          batchIndex: 0,
          mediaKind: 'image',
        },
      },
      { event: 'workflow.completed', data: { executionId: 'wfr_ok' } },
    ]);
  });

  it('fails fast when a workflow stays queued (worker deadlock)', async () => {
    vi.useFakeTimers();
    forgeFetchWithRetry.mockResolvedValue({
      id: 'wfr_stuck',
      businessState: 'queued',
      result: {},
    });

    const events: ForgeRuntimeEvent[] = [];
    const poll = pollWorkflowEvents(
      'wfr_stuck',
      {
        recipeId: 'kol.hex-tile.v1',
        destinationPath: 'content/images/composite/hex/guard.png',
      },
      (event) => events.push(event),
    );
    const rejection = expect(poll).rejects.toThrow(/stuck in queued/i);
    await vi.advanceTimersByTimeAsync(121_000);
    await rejection;
    expect(events.some((event) => event.event === 'workflow.progress')).toBe(true);
    vi.useRealTimers();
  });
});
