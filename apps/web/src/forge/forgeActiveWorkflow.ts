import { forgeFetch } from './forgeApi.js';
import { FORGE_PROJECT_ID } from './forgeOptions.js';

const FAILURE_TERMINAL_STATES = new Set([
  'failed_terminal',
  'failed_retryable',
  'cancelled',
]);

interface ForgeWorkflowRow {
  readonly id: string;
  readonly businessState: string;
}

interface ForgeWorkflowPage {
  readonly items?: readonly ForgeWorkflowRow[];
}

function normalizeWorkflowList(
  data: readonly ForgeWorkflowRow[] | ForgeWorkflowPage,
): ForgeWorkflowRow[] {
  if (Array.isArray(data)) return [...data];
  if ('items' in data && data.items) return [...data.items];
  return [];
}

/** Latest non-failed workflow for an asset — used to resume after active_production 409. */
export async function findResumableWorkflowForAsset(
  assetSpecId: string,
): Promise<string | null> {
  const data = await forgeFetch<readonly ForgeWorkflowRow[] | ForgeWorkflowPage>(
    `/workflows?projectId=${encodeURIComponent(FORGE_PROJECT_ID)}`
      + `&assetSpecId=${encodeURIComponent(assetSpecId)}&limit=5`,
  );
  for (const row of normalizeWorkflowList(data)) {
    if (!FAILURE_TERMINAL_STATES.has(row.businessState)) {
      return row.id;
    }
  }
  return null;
}

export function isActiveProductionGenerateError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('(409)') && message.includes('active_production');
}
