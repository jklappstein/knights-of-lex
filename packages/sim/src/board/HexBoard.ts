import type { FoundationalSymbol, HexCoord } from '@kol/shared-types';
import type { StrictRng } from '../rng/StrictRng.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export interface BoardTile {
  coord: HexCoord;
  letter: string;
  combatSymbol: FoundationalSymbol;
  revision: number;
}

export function generateHexCoords(radius: number): readonly HexCoord[] {
  const coords: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      coords.push({ q, r });
    }
  }
  return coords;
}

export function generateBoard(
  heroId: string,
  symbols: readonly FoundationalSymbol[],
  rng: StrictRng,
): BoardTile[] {
  const coords = generateHexCoords(3);
  return coords.map((coord) => ({
    coord,
    letter: LETTERS[rng.nextInt(0, LETTERS.length - 1)] ?? 'A',
    combatSymbol: rng.pick(symbols),
    revision: 0,
  }));
}

export function refillTiles(
  tiles: BoardTile[],
  usedCoords: readonly HexCoord[],
  symbols: readonly FoundationalSymbol[],
  rng: StrictRng,
): BoardTile[] {
  const usedKeys = new Set(usedCoords.map((c) => `${c.q},${c.r}`));
  return tiles.map((tile) => {
    const key = `${tile.coord.q},${tile.coord.r}`;
    if (!usedKeys.has(key)) return tile;
    return {
      coord: tile.coord,
      letter: LETTERS[rng.nextInt(0, LETTERS.length - 1)] ?? 'A',
      combatSymbol: rng.pick(symbols),
      revision: tile.revision + 1,
    };
  });
}

export function areAdjacent(a: HexCoord, b: HexCoord): boolean {
  const dq = Math.abs(a.q - b.q);
  const dr = Math.abs(a.r - b.r);
  const ds = Math.abs(a.q + a.r - b.q - b.r);
  return dq <= 1 && dr <= 1 && ds <= 1 && !(dq === 0 && dr === 0);
}

export function validatePath(
  path: readonly HexCoord[],
  tiles: readonly BoardTile[],
): { valid: true; letters: string } | { valid: false; code: string } {
  if (path.length < 3) {
    return { valid: false, code: 'PATH_TOO_SHORT' };
  }

  const tileMap = new Map(tiles.map((t) => [`${t.coord.q},${t.coord.r}`, t]));
  const used = new Set<string>();
  let letters = '';

  for (let i = 0; i < path.length; i++) {
    const coord = path[i];
    if (!coord) return { valid: false, code: 'INVALID_PATH' };

    const key = `${coord.q},${coord.r}`;
    if (used.has(key)) return { valid: false, code: 'TILE_REUSED' };

    const tile = tileMap.get(key);
    if (!tile) return { valid: false, code: 'TILE_NOT_FOUND' };

    if (i > 0) {
      const prev = path[i - 1];
      if (!prev || !areAdjacent(prev, coord)) {
        return { valid: false, code: 'NOT_ADJACENT' };
      }
    }

    used.add(key);
    letters += tile.letter;
  }

  return { valid: true, letters };
}

export function lengthScalar(wordLength: number): number {
  return 1 + (wordLength - 3) * 0.15;
}
