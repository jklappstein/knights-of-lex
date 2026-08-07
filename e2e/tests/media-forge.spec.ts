import { test, expect } from '@playwright/test';
import { waitForGameBridge } from '../helpers/gameBridge.js';

test.describe('Media & Forge — gfx, slice animation, sfx/music gen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForGameBridge(page);
    await page.waitForFunction(() => {
      const scene = document.querySelector('canvas');
      return scene && scene.clientWidth > 0;
    }, null, { timeout: 30_000 });
    await page.waitForTimeout(1200);
  });

  test('visual registry — all artKeys resolve textures after boot', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const bridge = window.__KOL_TEST__;
      if (!bridge?.runRegistryCoverageSmoke) {
        return { ok: false, total: 0, resolved: 0, missing: [] as string[] };
      }
      return bridge.runRegistryCoverageSmoke();
    });

    expect(result.total).toBeGreaterThan(100);
    expect(result.resolved).toBe(result.total);
    expect(result.missing).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test('gfx smoke — placeholder texture resolves for item artKey', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const bridge = window.__KOL_TEST__;
      if (!bridge?.runGfxSmoke) return { ok: false, artKey: '', textureKey: '' };
      return bridge.runGfxSmoke('items/militia_sword');
    });

    expect(result.ok).toBe(true);
    expect(result.artKey).toBe('items/militia_sword');
    expect(result.textureKey).toContain('kol-art:');
  });

  test('2x2 slice sheet animates through visual states', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const bridge = window.__KOL_TEST__;
      if (!bridge?.runSliceAnimationSmoke) {
        return { ok: false, visitedStates: [], sheetArtKey: '' };
      }
      return bridge.runSliceAnimationSmoke();
    });

    expect(result.sheetArtKey).toBe('items/militia_sword_sheet');
    expect(result.visitedStates).toContain('idle');
    expect(result.visitedStates).toContain('hover');
    expect(result.visitedStates).toContain('selected');
    expect(result.visitedStates).toContain('equipped');
    expect(result.ok).toBe(true);
  });

  test('sfx port records play intent', async ({ page }) => {
    const result = await page.evaluate(() => {
      const bridge = window.__KOL_TEST__;
      if (!bridge?.playTestSfx || !bridge.probeMedia) return { played: false, lastSfxId: null };
      bridge.playTestSfx('ui_click');
      const probe = bridge.probeMedia();
      return { played: probe.lastSfxId === 'ui_click', lastSfxId: probe.lastSfxId };
    });

    expect(result.played).toBe(true);
    expect(result.lastSfxId).toBe('ui_click');
  });

  test('music port tracks active slot', async ({ page }) => {
    const result = await page.evaluate(() => {
      const bridge = window.__KOL_TEST__;
      if (!bridge?.playTestMusic || !bridge.probeMedia) {
        return { ok: false, slot: null };
      }
      bridge.playTestMusic('zedwood_overland');
      const probe = bridge.probeMedia();
      return { ok: probe.currentMusicSlot === 'zedwood_overland', slot: probe.currentMusicSlot };
    });

    expect(result.ok).toBe(true);
    expect(result.slot).toBe('zedwood_overland');
  });

  test('forge sfx generation completes with sfx artifact path', async ({ page }) => {
    const forgeOnline = await page.evaluate(async () => {
      const bridge = window.__KOL_TEST__;
      return bridge?.probeForgeHealth ? bridge.probeForgeHealth() : false;
    });
    test.skip(!forgeOnline, 'Forge control plane is offline');

    const result = await page.evaluate(async () => {
      const bridge = window.__KOL_TEST__;
      if (!bridge?.runForgeSfxGen) {
        return { ok: false, skipped: true, mediaKind: null, destinationPath: null, events: [] as string[] };
      }
      try {
        return { ...(await bridge.runForgeSfxGen()), skipped: false };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('Asset not found')) {
          return { ok: false, skipped: true, mediaKind: null, destinationPath: null, events: [] as string[] };
        }
        throw err;
      }
    });

    test.skip(result.skipped, 'Forge audio assets are not synced');

    expect(result.ok).toBe(true);
    expect(result.mediaKind).toBe('sfx');
    expect(result.destinationPath).toContain('content/sounds/');
    expect(result.events).toContain('workflow.completed');
    expect(result.events).toContain('artifact.ready');
  });

  test('forge music generation completes with music artifact path', async ({ page }) => {
    const forgeOnline = await page.evaluate(async () => {
      const bridge = window.__KOL_TEST__;
      return bridge?.probeForgeHealth ? bridge.probeForgeHealth() : false;
    });
    test.skip(!forgeOnline, 'Forge control plane is offline');

    const result = await page.evaluate(async () => {
      const bridge = window.__KOL_TEST__;
      if (!bridge?.runForgeMusicGen) {
        return { ok: false, skipped: true, mediaKind: null, destinationPath: null, events: [] as string[] };
      }
      try {
        return { ...(await bridge.runForgeMusicGen()), skipped: false };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('Asset not found')) {
          return { ok: false, skipped: true, mediaKind: null, destinationPath: null, events: [] as string[] };
        }
        throw err;
      }
    });

    test.skip(result.skipped, 'Forge audio assets are not synced');

    expect(result.ok).toBe(true);
    expect(result.mediaKind).toBe('music');
    expect(result.destinationPath).toContain('content/music/');
    expect(result.events).toContain('workflow.completed');
  });

  test('forge panel supports asset browser and variant grid', async ({ page }) => {
    test.setTimeout(240_000);
    const forgeOnline = await page.evaluate(async () => {
      const bridge = window.__KOL_TEST__;
      return bridge?.probeForgeHealth ? bridge.probeForgeHealth() : false;
    });
    test.skip(!forgeOnline, 'Forge control plane is offline');

    const result = await page.evaluate(async () => {
      const bridge = window.__KOL_TEST__;
      if (!bridge?.openForgeArtKey) return { loaded: false, variants: 0 };
      bridge.openForgeArtKey('ui/icons/gold');
      const provider = document.querySelector('[data-testid="forge-panel"] [name="provider"]') as HTMLSelectElement | null;
      const providerReadyDeadline = Date.now() + 15_000;
      while (Date.now() < providerReadyDeadline) {
        if (provider && provider.options.length > 0 && provider.value) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      const panel = document.querySelector('[data-testid="forge-panel"]');
      const family = document.querySelector('[data-testid="forge-family"]');
      const asset = document.querySelector('[data-testid="forge-asset"]');
      const form = document.querySelector('[data-testid="forge-panel"] [data-form]') as HTMLFormElement | null;
      const batch = form?.elements.namedItem('batchSize') as HTMLInputElement | null;
      if (batch) batch.value = '1';
      const generate = document.querySelector('[data-testid="forge-generate"]') as HTMLButtonElement | null;
      generate?.click();

      const deadline = Date.now() + 180_000;
      let variantCount = 0;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const grid = document.querySelector('[data-testid="forge-variant-grid"]');
        variantCount = grid?.querySelectorAll('.kol-forge-variant').length ?? 0;
        if (variantCount >= 1) break;
      }

      const grid = document.querySelector('[data-testid="forge-variant-grid"]');
      return {
        loaded: Boolean(panel && family && asset && form && !form.hidden),
        variants: variantCount,
        log: document.querySelector('[data-testid="forge-log"]')?.textContent ?? '',
      };
    });

    expect(result.loaded).toBe(true);
    expect(result.variants).toBeGreaterThanOrEqual(1);
  });

  test('forge panel is mounted in left margin', async ({ page }) => {
    const margin = page.locator('#kol-left-margin');
    const panel = page.locator('[data-testid="forge-panel"]');
    await expect(margin).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(panel.locator('h2')).toContainText('Zencode Forge');
    await expect(panel.locator('[data-testid="forge-log"]')).toBeVisible();
  });
});

declare global {
  interface Window {
    __KOL_TEST__?: {
      runGfxSmoke?: (artKey?: string) => Promise<{ ok: boolean; artKey: string; textureKey: string }>;
      runRegistryCoverageSmoke?: () => Promise<{
        ok: boolean;
        total: number;
        resolved: number;
        missing: string[];
      }>;
      runSliceAnimationSmoke?: () => Promise<{ ok: boolean; visitedStates: string[]; sheetArtKey: string }>;
      runForgeSfxGen?: () => Promise<{
        ok: boolean;
        mediaKind: string | null;
        destinationPath: string | null;
        events: string[];
      }>;
      runForgeMusicGen?: () => Promise<{
        ok: boolean;
        mediaKind: string | null;
        destinationPath: string | null;
        events: string[];
      }>;
      playTestSfx?: (soundId: string) => void;
      playTestMusic?: (slotKey: string) => void;
      openForgeArtKey: (artKey: string) => void;
      probeMedia?: () => { lastSfxId: string | null; currentMusicSlot: string | null };
      probeForgeHealth?: () => Promise<boolean>;
    };
  }
}
