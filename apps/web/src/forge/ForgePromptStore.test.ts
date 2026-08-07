import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FORGE_PROMPT_SAVE_DEBOUNCE_MS,
  debounce,
  loadAllForgeAlphaPrefs,
  loadForgePromptDraft,
  mergeForgePromptDraft,
  saveForgePromptDraft,
} from './ForgePromptStore.js';

describe('ForgePromptStore', () => {
  const storage = new Map<string, string>();

  afterEach(() => {
    storage.clear();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      key: (index: number) => [...storage.keys()][index] ?? null,
      get length() {
        return storage.size;
      },
    });
  });

  it('round-trips prompt drafts per artKey', () => {
    saveForgePromptDraft('branding/knights_of_lex_logo', {
      prompt: 'Heraldic logo',
      negativePrompt: 'no text',
    });

    expect(loadForgePromptDraft('branding/knights_of_lex_logo')).toEqual({
      prompt: 'Heraldic logo',
      negativePrompt: 'no text',
    });
    expect(loadForgePromptDraft('ui/icons/gold')).toBeNull();
  });

  it('merges saved transparentBackground over defaults', () => {
    saveForgePromptDraft('ui/surfaces/combat_arena', {
      prompt: 'Arena',
      negativePrompt: 'blur',
      transparentBackground: false,
    });

    expect(
      mergeForgePromptDraft('ui/surfaces/combat_arena', {
        prompt: 'Default',
        negativePrompt: 'watermark',
        transparentBackground: true,
      }),
    ).toEqual({
      prompt: 'Arena',
      negativePrompt: 'blur',
      transparentBackground: false,
    });
  });

  it('loadAllForgeAlphaPrefs maps logical keys', () => {
    saveForgePromptDraft('ui/surfaces/combat_arena', {
      prompt: 'Arena',
      negativePrompt: '',
      transparentBackground: false,
    });

    expect(loadAllForgeAlphaPrefs()).toEqual({
      'kol.gfx.ui.surfaces.combat_arena': false,
    });
  });

  it('merges saved draft over defaults', () => {
    saveForgePromptDraft('items/militia_sword', {
      prompt: 'Custom sword',
      negativePrompt: 'blur',
    });

    expect(
      mergeForgePromptDraft('items/militia_sword', {
        prompt: 'Default sword',
        negativePrompt: 'watermark',
      }),
    ).toEqual({
      prompt: 'Custom sword',
      negativePrompt: 'blur',
    });
  });

  it('debounces callback invocations', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const debounced = debounce(spy, FORGE_PROMPT_SAVE_DEBOUNCE_MS);

    debounced.schedule();
    debounced.schedule();
    debounced.schedule();

    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(FORGE_PROMPT_SAVE_DEBOUNCE_MS - 1);
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('flush runs pending callback immediately', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const debounced = debounce(spy, FORGE_PROMPT_SAVE_DEBOUNCE_MS);

    debounced.schedule();
    debounced.flush();

    expect(spy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(FORGE_PROMPT_SAVE_DEBOUNCE_MS);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
