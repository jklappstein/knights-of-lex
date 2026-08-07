import { artContentPathFromKey } from '../gfx/artKeys.js';
import { HttpForgePort } from './HttpForgePort.js';

export function promotionPathForArtKey(artKey: string): string {
  return artContentPathFromKey(artKey);
}

export async function createForgePort(): Promise<import('../ports/ForgePort.js').ForgePort> {
  return new HttpForgePort();
}
