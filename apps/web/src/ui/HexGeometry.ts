import type { HexCoord } from '@kol/shared-types';

/**
 * Pointy-top hex layout (Red Blob Games axial).
 * `HEX_SIZE` is edge length, which equals circumradius for a regular hexagon.
 */
export const HEX_SIZE = 26;

const SQRT3 = Math.sqrt(3);

/** Axial directions — each hex links to exactly these 6 neighbors. */
export const AXIAL_NEIGHBOR_DELTAS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function axialToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (SQRT3 * q + (SQRT3 / 2) * r);
  const y = HEX_SIZE * ((3 / 2) * r);
  return { x, y };
}

export function pixelToAxial(x: number, y: number): HexCoord {
  const q = ((SQRT3 / 3) * x - (1 / 3) * y) / HEX_SIZE;
  const r = ((2 / 3) * y) / HEX_SIZE;
  return axialRound(q, r);
}

function axialRound(q: number, r: number): HexCoord {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

export function coordKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function getAxialNeighbors(coord: HexCoord): readonly HexCoord[] {
  return AXIAL_NEIGHBOR_DELTAS.map((d) => ({ q: coord.q + d.q, r: coord.r + d.r }));
}

export function areAdjacent(a: HexCoord, b: HexCoord): boolean {
  const dq = Math.abs(a.q - b.q);
  const dr = Math.abs(a.r - b.r);
  const ds = Math.abs(a.q + a.r - b.q - b.r);
  return dq <= 1 && dr <= 1 && ds <= 1 && !(dq === 0 && dr === 0);
}

/** Vertices for a pointy-top hex centered at origin (tip at top). */
export function hexVertices(radius: number): { x: number; y: number }[] {
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    verts.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return verts;
}

/** Ray-casting point-in-polygon (local coords relative to hex center). */
export function pointInPolygon(x: number, y: number, verts: readonly { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const vi = verts[i];
    const vj = verts[j];
    if (!vi || !vj) continue;
    const intersect = (vi.y > y) !== (vj.y > y)
      && x < ((vj.x - vi.x) * (y - vi.y)) / (vj.y - vi.y) + vi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function containsPointInHex(
  localX: number,
  localY: number,
  coord: HexCoord,
): boolean {
  const center = axialToPixel(coord.q, coord.r);
  const verts = hexVertices(HEX_SIZE);
  return pointInPolygon(localX - center.x, localY - center.y, verts);
}

/**
 * Pick the tile under a screen pointer using hex geometry (not overlapping circles).
 * Prefers the hex whose polygon contains the point; ties break toward nearest center.
 */
export function pickTileAt(
  worldX: number,
  worldY: number,
  centerX: number,
  centerY: number,
  tileCoords: ReadonlyMap<string, HexCoord>,
): HexCoord | null {
  const localX = worldX - centerX;
  const localY = worldY - centerY;

  let best: HexCoord | null = null;
  let bestDist = Infinity;

  for (const coord of tileCoords.values()) {
    if (!containsPointInHex(localX, localY, coord)) continue;
    const pos = axialToPixel(coord.q, coord.r);
    const dist = (localX - pos.x) ** 2 + (localY - pos.y) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = coord;
    }
  }

  if (best) return best;

  return findNearestTile(worldX, worldY, centerX, centerY, tileCoords);
}

export function findNearestTile(
  worldX: number,
  worldY: number,
  centerX: number,
  centerY: number,
  tileCoords: ReadonlyMap<string, HexCoord>,
): HexCoord | null {
  const localX = worldX - centerX;
  const localY = worldY - centerY;
  const approx = pixelToAxial(localX, localY);
  const key = coordKey(approx);

  if (tileCoords.has(key)) return approx;

  let best: HexCoord | null = null;
  let bestDist = Infinity;
  for (const coord of tileCoords.values()) {
    const pos = axialToPixel(coord.q, coord.r);
    const dx = localX - pos.x;
    const dy = localY - pos.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist && dist < HEX_SIZE * HEX_SIZE * 1.4) {
      bestDist = dist;
      best = coord;
    }
  }
  return best;
}

/**
 * When dragging a trace, only accept one of the 6 graph-neighbors of the last tile.
 * This ensures the hex above links via upper-left OR upper-right, not a disconnected jump.
 */
export function findNeighborUnderPointer(
  worldX: number,
  worldY: number,
  centerX: number,
  centerY: number,
  lastCoord: HexCoord,
  tileCoords: ReadonlyMap<string, HexCoord>,
): HexCoord | null {
  const localX = worldX - centerX;
  const localY = worldY - centerY;

  let best: HexCoord | null = null;
  let bestDist = Infinity;

  for (const neighbor of getAxialNeighbors(lastCoord)) {
    const key = coordKey(neighbor);
    if (!tileCoords.has(key)) continue;
    if (!containsPointInHex(localX, localY, neighbor)) continue;

    const pos = axialToPixel(neighbor.q, neighbor.r);
    const dx = localX - pos.x;
    const dy = localY - pos.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = neighbor;
    }
  }

  const pickRadius = HEX_SIZE * HEX_SIZE * 1.6;
  return bestDist < pickRadius ? best : null;
}

export interface TracePreview {
  readonly letters: string;
  readonly isValidLength: boolean;
  readonly isValidWord: boolean;
  readonly moveName: string | null;
}

export function buildTraceLetters(
  path: readonly HexCoord[],
  letterMap: ReadonlyMap<string, string>,
): string {
  return path.map((c) => letterMap.get(coordKey(c)) ?? '').join('');
}

/** Neighbors visually above a coord (for pointy-top layout). */
export function neighborsAbove(coord: HexCoord): readonly HexCoord[] {
  return getAxialNeighbors(coord).filter((n) => {
    const pos = axialToPixel(n.q, n.r);
    const center = axialToPixel(coord.q, coord.r);
    return pos.y < center.y - 0.01;
  });
}
