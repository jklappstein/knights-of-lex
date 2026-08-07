import { buildAllForgeAssetSpecs } from './forgeAssetSpecs.js';
import { FORGE_PROJECT_MANIFEST } from './forgeManifest.js';
import { FORGE_PROFILE_DOCUMENTS } from './forgeProfiles.js';
import { loadAllForgeAlphaPrefs } from './ForgePromptStore.js';

export interface ForgeSyncPayload {
  readonly repositoryRevision: string;
  readonly adapterVersion: string;
  readonly manifestHash: string;
  readonly manifest: typeof FORGE_PROJECT_MANIFEST;
  readonly assets: ReturnType<typeof buildAllForgeAssetSpecs>;
  readonly profiles: typeof FORGE_PROFILE_DOCUMENTS;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
}

async function sha256Prefixed(value: unknown): Promise<string> {
  const text = stableJson(value);
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${hex}`;
}

export async function buildForgeSyncPayload(
  promptBriefs: Readonly<Record<string, string>> = {},
  repositoryRevision = 'web-dev',
): Promise<ForgeSyncPayload> {
  const briefResolver = (logicalKey: string, fallback: string): string => {
    const draft = promptBriefs[logicalKey];
    return draft?.trim() ? draft.trim() : fallback;
  };

  const manifest = FORGE_PROJECT_MANIFEST;
  const manifestHash = await sha256Prefixed(manifest);
  const alphaPrefs = loadAllForgeAlphaPrefs();

  return {
    repositoryRevision,
    adapterVersion: String(manifest.adapter.protocolVersion),
    manifestHash,
    manifest,
    assets: buildAllForgeAssetSpecs(briefResolver, alphaPrefs),
    profiles: [...FORGE_PROFILE_DOCUMENTS],
  };
}
