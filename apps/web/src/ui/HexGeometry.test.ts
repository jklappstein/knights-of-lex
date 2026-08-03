import { describe, expect, it } from 'vitest';
import {
  HEX_SIZE,
  areAdjacent,
  axialToPixel,
  findNeighborUnderPointer,
  getAxialNeighbors,
  neighborsAbove,
  pixelToAxial,
} from './HexGeometry.js';

describe('HexGeometry pointy-top linking', () => {
  it('uses pointy-top layout: two neighbors above connect upper-left and upper-right', () => {
    const center = { q: 0, r: 0 };
    const above = neighborsAbove(center);

    expect(above).toHaveLength(2);
    expect(above).toContainEqual({ q: 0, r: -1 });
    expect(above).toContainEqual({ q: 1, r: -1 });

    const centerPx = axialToPixel(0, 0);
    for (const n of above) {
      const px = axialToPixel(n.q, n.r);
      expect(px.y).toBeLessThan(centerPx.y);
      expect(Math.abs(px.x - centerPx.x)).toBeGreaterThan(0);
    }
  });

  it('neighbor centers are equidistant (proper tiling)', () => {
    const center = axialToPixel(0, 0);
    const expectedDist = HEX_SIZE * Math.sqrt(3);

    for (const n of getAxialNeighbors({ q: 0, r: 0 })) {
      const p = axialToPixel(n.q, n.r);
      const dist = Math.hypot(p.x - center.x, p.y - center.y);
      expect(dist).toBeCloseTo(expectedDist, 4);
    }
  });

  it('pixel round-trip lands on correct axial cell', () => {
    const original = { q: 2, r: -1 };
    const px = axialToPixel(original.q, original.r);
    const round = pixelToAxial(px.x, px.y);
    expect(round).toEqual(original);
  });

  it('areAdjacent matches axial neighbor deltas only', () => {
    expect(areAdjacent({ q: 0, r: 0 }, { q: 0, r: -1 })).toBe(true);
    expect(areAdjacent({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(true);
    expect(areAdjacent({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(false);
  });

  it('findNeighborUnderPointer only returns graph neighbors', () => {
    const tiles = new Map<string, { q: number; r: number }>();
    for (const n of getAxialNeighbors({ q: 0, r: 0 })) {
      tiles.set(`${n.q},${n.r}`, n);
    }
    tiles.set('0,0', { q: 0, r: 0 });

    const aboveLeft = axialToPixel(0, -1);
    const picked = findNeighborUnderPointer(
      aboveLeft.x,
      aboveLeft.y,
      0,
      0,
      { q: 0, r: 0 },
      tiles,
    );

    expect(picked).toEqual({ q: 0, r: -1 });
  });
});
