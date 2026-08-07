import type Phaser from 'phaser';
import type { ForgeRecipeId } from '../ports/ForgePort.js';
import type { MediaPorts } from '../ports/MediaPorts.js';
import { sliceSheetForArtKey } from '../gfx/SliceSheetCatalog.js';
import { SliceSheetAnimator } from '../gfx/SliceSheetAnimator.js';
import type { SliceVisualState } from '../gfx/SliceSheetTypes.js';
import { textureKeyFromArtKey } from '../gfx/artKeys.js';
import { listAllArtKeys } from '../gfx/VisualRegistry.js';
import { buildForgeRequestForRecipe } from '../forge/buildForgeRequestForRecipe.js';
import { logicalKeyForTestRecipe } from '../forge/forgeAssetSpecs.js';

export interface GfxSmokeResult {
  readonly ok: boolean;
  readonly artKey: string;
  readonly textureKey: string;
}

export interface SliceAnimationSmokeResult {
  readonly ok: boolean;
  readonly visitedStates: readonly string[];
  readonly sheetArtKey: string;
}

export interface ForgeGenSmokeResult {
  readonly ok: boolean;
  readonly recipeId: ForgeRecipeId;
  readonly executionId: string;
  readonly events: readonly string[];
  readonly mediaKind: string | null;
  readonly destinationPath: string | null;
}

export interface MediaProbeSnapshot {
  readonly forgeOnline: boolean;
  readonly lastSfxId: string | null;
  readonly currentMusicSlot: string | null;
  readonly gfxTextureCount: number;
}

export interface RegistryCoverageResult {
  readonly ok: boolean;
  readonly total: number;
  readonly resolved: number;
  readonly missing: readonly string[];
}

export class MediaTestHarness {
  constructor(
    private readonly getGame: () => Phaser.Game | null,
    private readonly media: MediaPorts,
  ) {}

  private activeScene(): Phaser.Scene | null {
    const game = this.getGame();
    if (!game) return null;
    return game.scene.getScene('MainMenuScene')
      ?? game.scene.getScene('RunScene')
      ?? game.scene.getScene('BootScene');
  }

  probe(): MediaProbeSnapshot {
    const scene = this.activeScene();
    const textureCount = scene ? scene.textures.getTextureKeys().length : 0;
    return {
      forgeOnline: false,
      lastSfxId: this.media.sfx.getLastPlayedForTests(),
      currentMusicSlot: this.media.music.getCurrentSlotForTests(),
      gfxTextureCount: textureCount,
    };
  }

  async probeSnapshot(): Promise<MediaProbeSnapshot> {
    const base = this.probe();
    return { ...base, forgeOnline: await this.media.forge.health() };
  }

  async probeForgeHealth(): Promise<boolean> {
    return this.media.forge.health();
  }

  async runRegistryCoverageSmoke(): Promise<RegistryCoverageResult> {
    const scene = this.activeScene();
    const keys = listAllArtKeys();
    if (!scene) {
      return { ok: false, total: keys.length, resolved: 0, missing: keys };
    }

    const missing: string[] = [];
    for (const artKey of keys) {
      if (!this.media.gfx.hasTexture(scene, artKey)) {
        missing.push(artKey);
      }
    }

    return {
      ok: missing.length === 0,
      total: keys.length,
      resolved: keys.length - missing.length,
      missing,
    };
  }

  async runGfxSmoke(artKey = 'items/militia_sword'): Promise<GfxSmokeResult> {
    const scene = this.activeScene();
    if (!scene) {
      return { ok: false, artKey, textureKey: textureKeyFromArtKey(artKey) };
    }
    await this.media.gfx.preload(scene, [artKey]);
    const texKey = textureKeyFromArtKey(artKey);
    return {
      ok: this.media.gfx.hasTexture(scene, artKey),
      artKey,
      textureKey: texKey,
    };
  }

  async runSliceAnimationSmoke(
    states: readonly SliceVisualState[] = ['idle', 'hover', 'selected', 'equipped'],
  ): Promise<SliceAnimationSmokeResult> {
    const scene = this.activeScene();
    const artKey = 'items/militia_sword';
    const spec = sliceSheetForArtKey(artKey);
    if (!scene || !spec) {
      return { ok: false, visitedStates: [], sheetArtKey: spec?.sheetArtKey ?? '' };
    }

    await this.media.gfx.ensureSliceSheet(scene, spec);
    const visited: string[] = [];
    const unsubscribe = SliceSheetAnimator.onStateChange((_sheet, state) => {
      if (!visited.includes(state)) visited.push(state);
    });

    const handle = this.media.gfx.addSliceSprite(scene, spec, -100, -100, 36, 'idle');
    if (!handle) {
      unsubscribe();
      return { ok: false, visitedStates: visited, sheetArtKey: spec.sheetArtKey };
    }

    for (const state of states) {
      handle.playState(state);
      await new Promise((r) => setTimeout(r, 80));
    }

    handle.destroy();
    unsubscribe();

    const ok = states.every((s) => visited.includes(s));
    return { ok, visitedStates: visited, sheetArtKey: spec.sheetArtKey };
  }

  async runForgeGeneration(recipeId: ForgeRecipeId): Promise<ForgeGenSmokeResult> {
    await this.media.forge.ensureSynced(logicalKeyForTestRecipe(recipeId));

    const request = buildForgeRequestForRecipe(recipeId);
    const { executionId } = await this.media.forge.generate(request);
    const events: string[] = [];
    let mediaKind: string | null = null;
    let destinationPath: string | null = null;

    await this.media.forge.streamEvents(executionId, (event) => {
      events.push(event.event);
      if (event.event === 'artifact.ready') {
        const data = event.data as { mediaKind?: string; destinationPath?: string };
        mediaKind = data.mediaKind ?? null;
        destinationPath = data.destinationPath ?? null;
      }
    });

    return {
      ok: events.includes('workflow.completed') && events.includes('artifact.ready'),
      recipeId,
      executionId,
      events,
      mediaKind,
      destinationPath,
    };
  }

  playSfx(soundId: string): void {
    const scene = this.activeScene();
    if (scene) this.media.sfx.play(scene, soundId);
  }

  playMusicSlot(slotKey: string): void {
    const scene = this.activeScene();
    if (scene) this.media.music.playSlot(scene, slotKey);
  }
}
