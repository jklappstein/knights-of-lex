import { describe, expect, it } from 'vitest';
import {
  defaultProviderModel,
  filterProvidersForRecipe,
  OFFLINE_FORGE_PROVIDERS,
} from './forgeProviderPolicy.js';

describe('forgeProviderPolicy', () => {
  it('limits openai-image to gpt-image-2 only', () => {
    const providers = [
      {
        id: 'openai-image',
        label: 'OpenAI Images',
        kind: 'image',
        defaultModel: 'gpt-image-2',
        models: [
          { id: 'gpt-image-2', label: 'GPT Image 2', default: true },
          { id: 'gpt-image-1', label: 'GPT Image 1' },
        ],
      },
    ];
    const filtered = filterProvidersForRecipe(providers, 'kol.item-icon.v1');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.models.map((m) => m.id)).toEqual(['gpt-image-2']);
  });

  it('defaults image gfx to openai-image / gpt-image-2', () => {
    const defaults = defaultProviderModel(OFFLINE_FORGE_PROVIDERS, 'kol.hex-tile.v1');
    expect(defaults).toEqual({ provider: 'openai-image', model: 'gpt-image-2' });
  });
});
