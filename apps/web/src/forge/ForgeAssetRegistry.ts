import { FORGE_PROJECT_ID } from './forgeOptions.js';
import { listForgeAssets } from './forgeApi.js';

export class ForgeAssetRegistry {
  private logicalKeyToSpecId = new Map<string, string>();

  async refresh(): Promise<void> {
    const assets = await listForgeAssets(FORGE_PROJECT_ID);
    const next = new Map<string, string>();
    for (const asset of assets) {
      next.set(asset.logicalKey, asset.id);
    }
    this.logicalKeyToSpecId = next;
  }

  resolveSpecId(logicalKey: string): string | undefined {
    return this.logicalKeyToSpecId.get(logicalKey);
  }

  get size(): number {
    return this.logicalKeyToSpecId.size;
  }
}
