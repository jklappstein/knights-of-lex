import type { ForgeRecipeId } from '../ports/ForgePort.js';
import type { ForgeProviderInfo } from './ForgeProviderInfo.js';

/** Knights of Lex image gfx uses GPT Image 2 only. */
export const KOL_IMAGE_MODEL_ALLOWLIST = ['gpt-image-2'] as const;

export function providerKindForRecipe(recipeId: ForgeRecipeId): 'image' | 'audio' {
  if (recipeId === 'kol.sfx.v1') return 'audio';
  if (recipeId === 'kol.music.v1') return 'audio';
  return 'image';
}

export function filterProvidersForRecipe(
  providers: readonly ForgeProviderInfo[],
  recipeId: ForgeRecipeId,
): ForgeProviderInfo[] {
  const kind = providerKindForRecipe(recipeId);
  const audioProviderIds = new Set(['elevenlabs-sfx', 'elevenlabs-music', 'elevenlabs-tts']);

  return providers
    .filter((provider) => {
      if (kind === 'audio') {
        return provider.kind === 'audio' || audioProviderIds.has(provider.id);
      }
      return provider.kind === 'image';
    })
    .map((provider) => {
      if (provider.id !== 'openai-image') return provider;
      const models = provider.models.filter((model) =>
        (KOL_IMAGE_MODEL_ALLOWLIST as readonly string[]).includes(model.id),
      );
      return {
        ...provider,
        models,
        defaultModel: models[0]?.id ?? 'gpt-image-2',
      };
    })
    .filter((provider) => provider.models.length > 0);
}

export function defaultProviderModel(
  providers: readonly ForgeProviderInfo[],
  recipeId: ForgeRecipeId,
): { provider: string; model: string } {
  const filtered = filterProvidersForRecipe(providers, recipeId);
  const provider = filtered[0];
  if (!provider) {
    return recipeId === 'kol.sfx.v1'
      ? { provider: 'elevenlabs-sfx', model: 'eleven_text_to_sound_v2' }
      : recipeId === 'kol.music.v1'
        ? { provider: 'elevenlabs-music', model: 'music_v1' }
        : { provider: 'openai-image', model: 'gpt-image-2' };
  }
  const model = provider.defaultModel
    ?? provider.models.find((m) => m.default)?.id
    ?? provider.models[0]?.id
    ?? 'gpt-image-2';
  return { provider: provider.id, model };
}

/** Offline fallback aligned with Forge provider_sdk catalog. */
export const OFFLINE_FORGE_PROVIDERS: readonly ForgeProviderInfo[] = [
  {
    id: 'openai-image',
    label: 'OpenAI Images',
    kind: 'image',
    defaultModel: 'gpt-image-2',
    models: [{ id: 'gpt-image-2', label: 'GPT Image 2', default: true }],
  },
  {
    id: 'elevenlabs-sfx',
    label: 'ElevenLabs SFX',
    kind: 'audio',
    defaultModel: 'eleven_text_to_sound_v2',
    models: [{ id: 'eleven_text_to_sound_v2', label: 'Text to Sound v2', default: true }],
  },
  {
    id: 'elevenlabs-music',
    label: 'ElevenLabs Music',
    kind: 'audio',
    defaultModel: 'music_v1',
    models: [{ id: 'music_v1', label: 'Music v1', default: true }],
  },
];
