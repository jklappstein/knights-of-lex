import type { Page } from '@playwright/test';

export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export interface GamePixel {
  readonly x: number;
  readonly y: number;
}

export function gamePixelToCanvasOffset(
  gameX: number,
  gameY: number,
  canvasWidth: number,
  canvasHeight: number,
): GamePixel {
  const scale = Math.min(canvasWidth / GAME_WIDTH, canvasHeight / GAME_HEIGHT);
  const offsetX = (canvasWidth - GAME_WIDTH * scale) / 2;
  const offsetY = (canvasHeight - GAME_HEIGHT * scale) / 2;
  return {
    x: offsetX + gameX * scale,
    y: offsetY + gameY * scale,
  };
}

async function gameToCanvasPosition(
  page: Page,
  gameX: number,
  gameY: number,
): Promise<{ x: number; y: number }> {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Canvas not visible');
  }

  const position = gamePixelToCanvasOffset(gameX, gameY, box.width, box.height);
  return {
    x: box.x + position.x,
    y: box.y + position.y,
  };
}

/** Map a Phaser game-space coordinate to a click position inside the canvas element. */
export async function clickGame(page: Page, gameX: number, gameY: number): Promise<void> {
  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ state: 'visible' });

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Canvas not visible');
  }

  const position = gamePixelToCanvasOffset(gameX, gameY, box.width, box.height);
  await canvas.click({ position });
}

/** Trace a word path on the hex board using real pointer drag events. */
export async function traceHexPathPixels(
  page: Page,
  pixels: readonly { x: number; y: number }[],
): Promise<void> {
  if (pixels.length === 0) {
    throw new Error('Cannot trace an empty hex path');
  }

  const first = await gameToCanvasPosition(page, pixels[0]!.x, pixels[0]!.y);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();

  for (let i = 1; i < pixels.length; i++) {
    const point = await gameToCanvasPosition(page, pixels[i]!.x, pixels[i]!.y);
    await page.mouse.move(point.x, point.y, { steps: 4 });
    await page.waitForTimeout(40);
  }

  await page.mouse.up();
}
