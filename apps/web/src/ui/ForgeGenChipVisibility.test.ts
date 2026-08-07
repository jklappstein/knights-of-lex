import { describe, expect, it } from 'vitest';
import {
  isForgeGenChipLayoutForced,
  resetForgeGenChipVisibilityForTests,
  setForgeGenChipLayoutForced,
  shouldAttachForgeGenChip,
} from './ForgeGenChipVisibility.js';
import { ArtResolver } from '../gfx/ArtResolver.js';

describe('ForgeGenChipVisibility', () => {
  it('forces chips visible in layout edit mode even for promoted art', () => {
    resetForgeGenChipVisibilityForTests();
    ArtResolver.markWireAvailable(['ui/icons/gold']);

    expect(shouldAttachForgeGenChip('ui/icons/gold')).toBe(false);
    setForgeGenChipLayoutForced(true);
    expect(isForgeGenChipLayoutForced()).toBe(true);
    expect(shouldAttachForgeGenChip('ui/icons/gold')).toBe(true);

    resetForgeGenChipVisibilityForTests();
    ArtResolver.resetCacheForTests();
  });
});
