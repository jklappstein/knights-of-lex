import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FORGE_SYNC_FINGERPRINT_STORAGE_KEY,
  loadPersistedSyncFingerprint,
  persistSyncFingerprint,
  prepareForgeSyncSnapshot,
} from './forgeSyncFingerprint.js';

describe('forgeSyncFingerprint', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists and reloads the sync fingerprint', () => {
    expect(loadPersistedSyncFingerprint()).toBeNull();
    persistSyncFingerprint('abc123');
    expect(loadPersistedSyncFingerprint()).toBe('abc123');
    expect(storage.get(FORGE_SYNC_FINGERPRINT_STORAGE_KEY)).toBe('abc123');
  });

  it('builds a reusable snapshot with matching fingerprint', async () => {
    const snapshot = await prepareForgeSyncSnapshot({});
    expect(snapshot.fingerprint.length).toBe(64);
    expect(snapshot.payload.assets.length).toBeGreaterThan(50);
    const again = await prepareForgeSyncSnapshot({});
    expect(again.fingerprint).toBe(snapshot.fingerprint);
  });
});
