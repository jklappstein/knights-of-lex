export const FORGE_API_BASE = '/api/forge';

/** Bearer-only Forge calls — omit cookies so workbench session cookies do not trigger CSRF. */
export const FORGE_FETCH_CREDENTIALS: RequestCredentials = 'omit';

export function readForgeToken(): string {
  return import.meta.env.VITE_FORGE_TOKEN ?? 'forge-dev-token';
}

export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Bearer ${readForgeToken()}`,
    ...extra,
  };
}

export async function forgeFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await forgeFetchResponse(path, init);
  return res.json() as Promise<T>;
}

function isRetryableForgeStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export async function forgeFetchResponse(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...authHeaders(),
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${FORGE_API_BASE}${path}`, {
    ...init,
    headers,
    credentials: FORGE_FETCH_CREDENTIALS,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const error = new Error(`Forge ${path} failed (${res.status}): ${text}`);
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
  return res;
}

/** Retry transient Forge 5xx / rate-limit responses (workflow polling, etc.). */
export async function forgeFetchWithRetry<T>(
  path: string,
  init: RequestInit = {},
  options: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 8;
  const baseDelayMs = options.baseDelayMs ?? 750;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await forgeFetch<T>(path, init);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;
      const status = (error as Error & { status?: number }).status;
      const retryable = status !== undefined && isRetryableForgeStatus(status);
      if (!retryable || attempt === maxAttempts) {
        throw error;
      }
      const delayMs = baseDelayMs * attempt;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, delayMs);
        init.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(init.signal?.reason ?? new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      });
    }
  }

  throw lastError ?? new Error(`Forge ${path} failed after retries`);
}

export async function forgeFetchBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const res = await fetch(`${FORGE_API_BASE}${path}`, {
    ...init,
    headers: authHeaders(init.headers as Record<string, string> | undefined),
    credentials: FORGE_FETCH_CREDENTIALS,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Forge ${path} failed (${res.status}): ${text}`);
  }
  return res.blob();
}

interface ForgeAssetOut {
  readonly id: string;
  readonly logicalKey: string;
}

interface ForgeAssetPage {
  readonly items?: readonly ForgeAssetOut[];
}

function normalizeAssetList(data: readonly ForgeAssetOut[] | ForgeAssetPage): ForgeAssetOut[] {
  if (Array.isArray(data)) return [...data];
  const page = data as ForgeAssetPage;
  return [...(page.items ?? [])];
}

export async function listForgeAssets(projectId: string): Promise<readonly ForgeAssetOut[]> {
  const data = await forgeFetch<readonly ForgeAssetOut[] | ForgeAssetPage>(
    `/assets?projectId=${encodeURIComponent(projectId)}&limit=500`,
  );
  return normalizeAssetList(data);
}
