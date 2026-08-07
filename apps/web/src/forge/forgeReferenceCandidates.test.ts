import { describe, expect, it } from 'vitest';
import { compositeForgeArtKey } from '../gfx/GfxCompositeCatalog.js';
import { gfxForgeEntryForArtKey } from '../gfx/GfxForgeCatalog.js';
import type { ForgeBatchArtifact } from './ForgeBatchArtifact.js';
import {
  buildArtifactReferenceCandidates,
  buildPromotedReferenceCandidates,
} from './forgeReferenceCandidates.js';

describe('forgeReferenceCandidates', () => {
  it('builds artifact candidates with labels', () => {
    const artifacts: ForgeBatchArtifact[] = [
      {
        artifactId: 'art_1',
        batchIndex: 0,
        previewUrl: 'blob:test',
        destinationPath: null,
        mediaKind: 'image',
      },
    ];
    const labels = new Map<number, string>([[0, 'Normal']]);
    const candidates = buildArtifactReferenceCandidates(artifacts, 'Militia Sword', labels);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.label).toBe('Militia Sword · Normal');
    expect(candidates[0]?.kind).toBe('artifact');
  });

  it('builds promoted candidates for forge entries in a family', () => {
    const entry = gfxForgeEntryForArtKey(compositeForgeArtKey('ui_buttons/primary'));
    const candidates = buildPromotedReferenceCandidates([entry], 'ui_buttons');
    expect(candidates.every((candidate) => candidate.kind === 'artKey')).toBe(true);
    for (const candidate of candidates) {
      expect(candidate.thumbUrl).toContain('/content/images/');
    }
  });
});
