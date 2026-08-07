import { ArtResolver } from '../gfx/ArtResolver.js';
import { artUrlFromKey } from '../gfx/artKeys.js';
import type { GfxForgeEntry, GfxForgeFamily } from '../gfx/GfxForgeCatalog.js';
import type { ForgeBatchArtifact } from './ForgeBatchArtifact.js';
import type { ForgeReferenceCandidate } from './ForgeReferenceCandidate.js';

function shortLabelForArtKey(artKey: string): string {
  const tail = artKey.split('/').pop() ?? artKey;
  return tail.length > 14 ? `${tail.slice(0, 12)}…` : tail;
}

function promotedThumbArtKey(entry: GfxForgeEntry): string {
  if (entry.compositeGroup?.sheetPromotionArtKey) {
    return entry.compositeGroup.sheetPromotionArtKey;
  }
  return entry.artKey;
}

export function hasPromotedArtForEntry(entry: GfxForgeEntry): boolean {
  const thumbKey = promotedThumbArtKey(entry);
  return ArtResolver.isKnownAvailable(thumbKey) === true;
}

export function buildPromotedReferenceCandidates(
  entries: readonly GfxForgeEntry[],
  family: GfxForgeFamily,
  excludeArtKey?: string,
): ForgeReferenceCandidate[] {
  const filtered = entries
    .filter((entry) => entry.family === family)
    .filter((entry) => excludeArtKey ? entry.artKey !== excludeArtKey : true)
    .filter(hasPromotedArtForEntry);

  return filtered.map((entry) => {
    const thumbKey = promotedThumbArtKey(entry);
    return {
      id: `artKey:${entry.artKey}`,
      kind: 'artKey',
      label: `${entry.displayName} (${entry.artKey})`,
      shortLabel: shortLabelForArtKey(entry.artKey),
      thumbUrl: artUrlFromKey(thumbKey),
      artKey: entry.artKey,
      artifactId: null,
    };
  });
}

export function buildArtifactReferenceCandidates(
  artifacts: readonly ForgeBatchArtifact[],
  sourceLabel: string,
  cellLabels: ReadonlyMap<number, string>,
): ForgeReferenceCandidate[] {
  const candidates: ForgeReferenceCandidate[] = [];
  for (const artifact of artifacts) {
    if (!artifact.previewUrl) continue;
    const cellLabel = cellLabels.get(artifact.batchIndex);
    const versionLabel = artifact.cellArtifactIds
      ? `set ${artifact.batchIndex + 1}`
      : (cellLabel ?? `v${artifact.batchIndex + 1}`);
    candidates.push({
      id: `artifact:${artifact.artifactId}`,
      kind: 'artifact',
      label: `${sourceLabel} · ${versionLabel}`,
      shortLabel: versionLabel,
      thumbUrl: artifact.previewUrl,
      artKey: null,
      artifactId: artifact.artifactId,
    });
  }
  return candidates;
}
