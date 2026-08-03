import type { HexCoord } from '@kol/shared-types';
export const HEX_RADIUS = 26;

export function axialToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_RADIUS * (3 / 2) * q;
  const y = HEX_RADIUS * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}

export function pixelToAxial(x: number, y: number): HexCoord {
  const q = ((2 / 3) * x) / HEX_RADIUS;
  const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / HEX_RADIUS;
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

export function areAdjacent(a: HexCoord, b: HexCoord): boolean {
  const dq = Math.abs(a.q - b.q);
  const dr = Math.abs(a.r - b.r);
  const ds = Math.abs(a.q + a.r - b.q - b.r);
  return dq <= 1 && dr <= 1 && ds <= 1 && !(dq === 0 && dr === 0);
}

/** Vertices for a pointy-top hex centered at origin. */
export function hexVertices(radius: number): { x: number; y: number }[] {
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    verts.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return verts;
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
    if (dist < bestDist && dist < HEX_RADIUS * HEX_RADIUS * 1.2) {
      bestDist = dist;
      best = coord;
    }
  }
  return best;
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
