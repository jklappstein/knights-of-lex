import { buildForgeSyncPayload, type ForgeSyncPayload } from './buildForgeSyncPayload.js';
import { loadAllForgePromptBriefs } from './ForgePromptStore.js';

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

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface ForgeSyncSnapshot {
  readonly fingerprint: string;
  readonly payload: ForgeSyncPayload;
}

/** Build sync payload once and fingerprint it — reuse payload for the POST body. */
export async function prepareForgeSyncSnapshot(
  promptBriefs: Readonly<Record<string, string>> = loadAllForgePromptBriefs(),
): Promise<ForgeSyncSnapshot> {
  const payload = await buildForgeSyncPayload(promptBriefs);
  const assetSlice = payload.assets.map((asset) => ({
    logicalKey: asset.logicalKey,
    recipe: asset.recipe,
    profile: asset.profile,
    requirements: asset.requirements,
    brief: asset.metadata.brief,
  }));
  const text = `${payload.manifestHash}:${payload.assets.length}:${stableJson(assetSlice)}`;
  const fingerprint = await sha256Hex(text);
  return { fingerprint, payload };
}

/** Fingerprint of the sync payload Kol would POST — changes when catalogue, prompts, or specs change. */
export async function computeSyncFingerprint(): Promise<string> {
  const snapshot = await prepareForgeSyncSnapshot();
  return snapshot.fingerprint;
}

export const FORGE_SYNC_FINGERPRINT_STORAGE_KEY = 'kol-forge-sync-fp:v1';

export function loadPersistedSyncFingerprint(): string | null {
  try {
    return sessionStorage.getItem(FORGE_SYNC_FINGERPRINT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function persistSyncFingerprint(fingerprint: string): void {
  try {
    sessionStorage.setItem(FORGE_SYNC_FINGERPRINT_STORAGE_KEY, fingerprint);
  } catch {
    // private browsing / quota — in-memory skip still works for this page
  }
}
