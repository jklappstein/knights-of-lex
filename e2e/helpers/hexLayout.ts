const GAME_WIDTH = 390;
const BOARD_CENTER_X = GAME_WIDTH / 2;
const BOARD_CENTER_Y = 500;
const HEX_SIZE = 26;
const SQRT3 = Math.sqrt(3);

export interface HexCoord {
  readonly q: number;
  readonly r: number;
}

function axialToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (SQRT3 * q + (SQRT3 / 2) * r);
  const y = HEX_SIZE * ((3 / 2) * r);
  return { x, y };
}

export function hexCoordToGamePixel(coord: HexCoord): { x: number; y: number } {
  const local = axialToPixel(coord.q, coord.r);
  return {
    x: BOARD_CENTER_X + local.x,
    y: BOARD_CENTER_Y + local.y,
  };
}
