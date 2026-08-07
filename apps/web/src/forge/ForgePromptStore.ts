import { gfxForgeAssetId } from '../gfx/GfxForgeCatalog.js';

export interface ForgePromptDraft {
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly transparentBackground?: boolean;
}

/** Bump when default briefs are rewritten so stale local drafts do not override. */
const STORAGE_PREFIX = 'kol-forge-prompts:v2:';
export const FORGE_PROMPT_SAVE_DEBOUNCE_MS = 600;

function storageKey(artKey: string): string {
  return `${STORAGE_PREFIX}${artKey}`;
}

export function loadForgePromptDraft(artKey: string): ForgePromptDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(artKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ForgePromptDraft>;
    if (typeof parsed.prompt !== 'string' || typeof parsed.negativePrompt !== 'string') {
      return null;
    }
    return {
      prompt: parsed.prompt,
      negativePrompt: parsed.negativePrompt,
      ...(typeof parsed.transparentBackground === 'boolean'
        ? { transparentBackground: parsed.transparentBackground }
        : {}),
    };
  } catch {
    return null;
  }
}

export function saveForgePromptDraft(artKey: string, draft: ForgePromptDraft): void {
  try {
    localStorage.setItem(storageKey(artKey), JSON.stringify(draft));
  } catch {
    // Quota or private browsing — ignore.
  }
}

export function mergeForgePromptDraft(
  artKey: string,
  request: ForgePromptDraft,
): ForgePromptDraft {
  const saved = loadForgePromptDraft(artKey);
  if (!saved) return request;
  const transparentBackground = saved.transparentBackground ?? request.transparentBackground;
  return {
    prompt: saved.prompt,
    negativePrompt: saved.negativePrompt,
    ...(typeof transparentBackground === 'boolean' ? { transparentBackground } : {}),
  };
}

/** Alpha prefs keyed by Forge logicalKey (e.g. kol.gfx.ui.surfaces.combat_arena). */
export function loadAllForgeAlphaPrefs(): Record<string, boolean> {
  const prefs: Record<string, boolean> = {};
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      const artKey = key.slice(STORAGE_PREFIX.length);
      const draft = loadForgePromptDraft(artKey);
      if (typeof draft?.transparentBackground !== 'boolean') continue;
      prefs[gfxForgeAssetId(artKey)] = draft.transparentBackground;
    }
  } catch {
    // localStorage unavailable
  }
  return prefs;
}

/** Prompt briefs keyed by Forge logicalKey (e.g. kol.gfx.items.militia_sword). */
export function loadAllForgePromptBriefs(): Record<string, string> {
  const briefs: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      const artKey = key.slice(STORAGE_PREFIX.length);
      const draft = loadForgePromptDraft(artKey);
      if (!draft?.prompt.trim()) continue;
      briefs[gfxForgeAssetId(artKey)] = draft.prompt.trim();
    }
  } catch {
    // localStorage unavailable
  }
  return briefs;
}

export interface DebouncedFn {
  schedule(): void;
  cancel(): void;
  flush(): void;
}

export function debounce(callback: () => void, delayMs: number): DebouncedFn {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const flush = (): void => {
    if (timer === null) return;
    cancel();
    callback();
  };

  const schedule = (): void => {
    cancel();
    timer = setTimeout(() => {
      timer = null;
      callback();
    }, delayMs);
  };

  return { schedule, cancel, flush };
}
