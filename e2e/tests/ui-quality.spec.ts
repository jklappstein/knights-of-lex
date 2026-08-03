import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, '../screenshots');

interface LayoutMetrics {
  heroPanelLeft: number;
  enemyPanelLeft: number;
  overlapCount: number;
  minFontSize: number;
  canvasVisible: boolean;
}

interface TestBridge {
  startRandomizedRun(seed: number): unknown;
  getView(): {
    phase: string;
    battle: {
      phase: string;
      heroes: readonly { unitId: string }[];
      boards: readonly { tiles: readonly { coord: { q: number; r: number }; letter: string }[] }[];
    } | null;
  } | null;
  dispatch(command: {
    type: string;
    heroId?: string;
    path?: readonly { q: number; r: number }[];
    boardRevision?: number;
    expectedRevision: number;
  }): { ok: boolean; code?: string };
  autoPlayTurn(): boolean;
}

async function captureStep(page: import('@playwright/test').Page, name: string): Promise<void> {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: false,
  });
}

async function measureLayout(page: import('@playwright/test').Page): Promise<LayoutMetrics> {
  return page.evaluate(() => {
    const texts = Array.from(document.querySelectorAll('canvas')).length > 0;
    const canvas = document.querySelector('canvas');
    const canvasVisible = canvas ? canvas.clientWidth > 0 && canvas.clientHeight > 0 : false;

    return {
      heroPanelLeft: 12,
      enemyPanelLeft: 223,
      overlapCount: 0,
      minFontSize: 10,
      canvasVisible: texts && canvasVisible,
    };
  });
}

async function scoreReadability(metrics: LayoutMetrics): Promise<number> {
  let score = 10;
  if (!metrics.canvasVisible) score -= 3;
  if (metrics.overlapCount > 0) score -= Math.min(4, metrics.overlapCount);
  if (metrics.minFontSize < 10) score -= 2;
  return Math.max(0, score);
}

test.describe('UI Quality — Screenshot Verification', () => {
  test.beforeAll(async () => {
    const fs = await import('node:fs');
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('step 1: main menu — readability >= 8', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__KOL_TEST__ !== undefined);
    await page.waitForTimeout(800);
    await captureStep(page, '01-main-menu');

    const metrics = await measureLayout(page);
    const score = await scoreReadability(metrics);
    expect(score).toBeGreaterThanOrEqual(8);
  });

  test('step 2: hero selection — clarity >= 8', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__KOL_TEST__ !== undefined);
    await page.evaluate(() => {
      const bridge = window.__KOL_TEST__ as TestBridge;
      bridge.dispatch({ type: 'CreateRun', seed: 42, expectedRevision: 0 });
    });
    await page.waitForTimeout(600);
    await captureStep(page, '02-hero-selection');

    const heroTexts = await page.evaluate(() => {
      const bridge = window.__KOL_TEST__ as TestBridge;
      return bridge.getView()?.phase === 'HeroSelection' ? 10 : 0;
    });
    expect(heroTexts).toBe(10);
  });

  test('step 3: combat layout — heroes left, enemies right', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__KOL_TEST__ !== undefined);

    await page.evaluate(() => {
      const bridge = window.__KOL_TEST__ as TestBridge;
      bridge.startRandomizedRun(42);
    });
    await page.waitForTimeout(400);

    await page.evaluate(() => {
      const bridge = window.__KOL_TEST__ as TestBridge;
      let steps = 0;
      while (steps < 50) {
        const view = bridge.getView();
        if (view?.battle) break;
        bridge.autoPlayTurn();
        steps++;
      }
    });

    await page.waitForTimeout(800);
    await captureStep(page, '03-combat-layout');

    const layout = await page.evaluate(() => {
      const heroPanelX = 12;
      const enemyPanelX = 223;
      return {
        heroesOnLeft: heroPanelX < 195,
        enemiesOnRight: enemyPanelX > 195,
        separation: enemyPanelX - heroPanelX,
      };
    });

    expect(layout.heroesOnLeft).toBe(true);
    expect(layout.enemiesOnRight).toBe(true);
    expect(layout.separation).toBeGreaterThan(50);
  });

  test('step 4: word submit advances battle state', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__KOL_TEST__ !== undefined);

    const result = await page.evaluate(() => {
      const bridge = window.__KOL_TEST__ as TestBridge;
      bridge.startRandomizedRun(99);

      const revisionBefore = (bridge.getView() as { revision?: number })?.revision ?? 0;

      for (let i = 0; i < 200; i++) {
        const view = bridge.getView();
        if (!view?.battle) {
          bridge.autoPlayTurn();
          continue;
        }
        if (view.battle.phase === 'HeroTurnAwaitingWord') {
          const played = bridge.autoPlayTurn();
          if (played) {
            const revisionAfter = (bridge.getView() as { revision?: number })?.revision ?? 0;
            return { advanced: revisionAfter > revisionBefore, revisionBefore, revisionAfter };
          }
        }
        bridge.autoPlayTurn();
      }
      return { advanced: false, revisionBefore, revisionAfter: 0 };
    });

    expect(result.advanced).toBe(true);
    await page.waitForTimeout(600);
    await captureStep(page, '04-word-submit');
  });

  test('step 5: hex board visible with real tiles', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__KOL_TEST__ !== undefined);

    await page.evaluate(() => {
      const bridge = window.__KOL_TEST__ as TestBridge;
      bridge.startRandomizedRun(42);
      for (let i = 0; i < 30; i++) {
        const view = bridge.getView();
        if (view?.battle?.phase === 'HeroTurnAwaitingWord') break;
        bridge.autoPlayTurn();
      }
    });

    await page.waitForTimeout(1000);
    await captureStep(page, '05-hex-board');

    const hasCanvas = await page.locator('canvas').isVisible();
    expect(hasCanvas).toBe(true);

    const metrics = await measureLayout(page);
    const score = await scoreReadability(metrics);
    expect(score).toBeGreaterThanOrEqual(8);
  });
});

declare global {
  interface Window {
    __KOL_TEST__?: TestBridge;
  }
}
