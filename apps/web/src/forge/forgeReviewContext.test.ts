import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ForgeGenerateRequest } from '../ports/ForgePort.js';

const forgeFetch = vi.fn();

vi.mock('./forgeApi.js', () => ({
  forgeFetch: (...args: unknown[]) => forgeFetch(...args),
}));

import { dismissPendingReview, fetchPendingReview } from './forgeReviewContext.js';

const request: ForgeGenerateRequest = {
  assetId: 'kol.gfx.branding.knights_of_lex_logo',
  artKey: 'branding/knights_of_lex_logo',
  recipeId: 'kol.brand-logo.v1',
  profileId: 'default',
  provider: 'openai-image',
  model: 'gpt-image-2',
  prompt: 'test',
  negativePrompt: '',
  width: 512,
  height: 512,
  batchSize: 4,
  transparentBackground: true,
  referenceImage: { mode: 'none', artKey: null, dataUrl: null, strength: 0 },
};

describe('forgeReviewContext', () => {
  beforeEach(() => {
    forgeFetch.mockReset();
  });

  it('fetchPendingReview maps review-context variants', async () => {
    forgeFetch.mockResolvedValueOnce({
      asset: { lifecycleState: 'review_pending' },
      workflow: { id: 'wfr_1', businessState: 'awaiting_review' },
      variants: [{ id: 'art_a' }, { id: 'art_b' }],
      suggestedDestination: { relativePath: 'content/images/branding/knights_of_lex_logo.png' },
    });

    const review = await fetchPendingReview(
      'ast_1',
      request,
      'content/images/branding/knights_of_lex_logo.png',
    );

    expect(review).toEqual({
      assetSpecId: 'ast_1',
      workflowId: 'wfr_1',
      variants: [
        {
          artifactId: 'art_a',
          batchIndex: 0,
          destinationPath: 'content/images/branding/knights_of_lex_logo.png',
          mediaKind: 'image',
        },
        {
          artifactId: 'art_b',
          batchIndex: 1,
          destinationPath: 'content/images/branding/knights_of_lex_logo.png',
          mediaKind: 'image',
        },
      ],
    });
  });

  it('fetchPendingReview returns null when asset is already promoted', async () => {
    forgeFetch.mockResolvedValueOnce({
      asset: { lifecycleState: 'promoted' },
      workflow: { id: 'wfr_old', businessState: 'completed' },
      variants: [{ id: 'art_a' }],
    });

    const review = await fetchPendingReview(
      'ast_1',
      request,
      'content/images/branding/knights_of_lex_logo.png',
    );

    expect(review).toBeNull();
  });

  it('dismissPendingReview requests refinement_requested', async () => {
    forgeFetch.mockResolvedValueOnce({ id: 'rev_1' });

    await dismissPendingReview('ast_1', 'art_a');

    expect(forgeFetch).toHaveBeenCalledWith('/reviews', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'knights-of-lex',
        assetSpecId: 'ast_1',
        artifactId: 'art_a',
        reviewerId: 'knights-of-lex-web',
        decision: 'refinement_requested',
      }),
    });
  });
});
