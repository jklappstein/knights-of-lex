import Phaser from 'phaser';
import type { ForgeGenerationPanel } from '../forge/ForgeGenerationPanel.js';
import { getForgePanel, getMediaPorts } from '../scenes/SceneRegistry.js';
import { PlayfieldArtCoordinator } from '../gfx/PlayfieldArtCoordinator.js';
import { forgeTargetArtKeyForRuntime } from '../forge/forgeArtPromotion.js';
import { shouldAttachForgeGenChip, resolveForgeChipDisplayDepth } from './ForgeGenChipVisibility.js';
import { FORGE_CHIP_DEPTH } from './SceneLayoutDepth.js';
import { UiTheme } from './UiTheme.js';

const CHIP_W = 32;
const CHIP_H = 20;
const HIT_PAD = 8;

export const FORGE_CHIP_DATA_KEY = 'kol-forge-chip';

function resolveWorldPoint(
  parent: Phaser.GameObjects.Container | undefined,
  localX: number,
  localY: number,
): { x: number; y: number } {
  if (!parent) return { x: localX, y: localY };
  const matrix = parent.getWorldTransformMatrix();
  const out = new Phaser.Math.Vector2();
  matrix.transformPoint(localX, localY, out);
  return { x: out.x, y: out.y };
}

function createForgeChipContainer(
  scene: Phaser.Scene,
  targetArtKey: string,
  worldX: number,
  worldY: number,
  depth: number,
): Phaser.GameObjects.Container {
  const container = scene.add.container(worldX, worldY);
  container.setDepth(depth);
  container.setData(FORGE_CHIP_DATA_KEY, true);

  const bg = scene.add.rectangle(0, 0, CHIP_W, CHIP_H, UiTheme.accentGoldDim, 0.96);
  bg.setStrokeStyle(1, 0xd4b76a, 0.95);
  bg.setData(FORGE_CHIP_DATA_KEY, true);
  bg.setInteractive(
    {
      hitArea: new Phaser.Geom.Rectangle(
        -CHIP_W / 2 - HIT_PAD,
        -CHIP_H / 2 - HIT_PAD,
        CHIP_W + HIT_PAD * 2,
        CHIP_H + HIT_PAD * 2,
      ),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    },
  );

  const label = scene.add.text(0, 0, 'Gen', {
    fontSize: '10px',
    color: '#1a1408',
    fontFamily: UiTheme.fontTitle,
  }).setOrigin(0.5);

  container.add([bg, label]);

  const openForge = (): void => {
    getMediaPorts(scene).sfx.play(scene, 'ui_click');
    getForgePanel(scene).openForArtKey(targetArtKey);
  };

  const activate = (event?: Phaser.Types.Input.EventData): void => {
    event?.stopPropagation();
    container.setScale(1);
    openForge();
  };

  bg.on('pointerover', () => {
    bg.setFillStyle(0xd4b76a, 1);
    container.setScale(1.05);
  });
  bg.on('pointerout', () => {
    bg.setFillStyle(UiTheme.accentGoldDim, 0.96);
    container.setScale(1);
  });
  bg.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
    event.stopPropagation();
    container.setScale(0.95);
    activate(event);
  });

  scene.children.bringToTop(container);
  return container;
}

/**
 * Registers a Forge Gen chip anchor for this art slot. Visible when wire art is missing,
 * or for all anchored slots while layout edit mode is active (including promoted art).
 */
export function attachForgeArtGenChip(
  scene: Phaser.Scene,
  artKey: string,
  x: number,
  y: number,
  parent?: Phaser.GameObjects.Container,
  depth = FORGE_CHIP_DEPTH,
): Phaser.GameObjects.Container | null {
  const targetArtKey = forgeTargetArtKeyForRuntime(artKey);
  const anchor = PlayfieldArtCoordinator.registerAnchor({
    scene,
    artKey,
    x,
    y,
    ...(parent ? { parent } : {}),
    depth,
    createChip: () => {
      const world = resolveWorldPoint(parent, x, y);
      const chipDepth = resolveForgeChipDisplayDepth(depth);
      const chip = createForgeChipContainer(scene, targetArtKey, world.x, world.y, chipDepth);
      PlayfieldArtCoordinator.registerChip(artKey, chip);
      return chip;
    },
  });
  return anchor.chip;
}

function gameObjectHasForgeChipTag(object: Phaser.GameObjects.GameObject): boolean {
  if (object.getData(FORGE_CHIP_DATA_KEY)) return true;
  const parent = (object as Phaser.GameObjects.GameObject & {
    parentContainer?: Phaser.GameObjects.Container | null;
  }).parentContainer;
  return parent ? gameObjectHasForgeChipTag(parent) : false;
}

export function pointerHitsForgeChip(scene: Phaser.Scene, pointer: Phaser.Input.Pointer): boolean {
  const hits = scene.input.hitTestPointer(pointer);
  return hits.some((hit) => gameObjectHasForgeChipTag(hit));
}

/** Test helper — opens forge panel without Phaser input (e2e / dev). */
export function openForgeForArtKey(panel: ForgeGenerationPanel, artKey: string): void {
  if (!shouldAttachForgeGenChip(artKey)) return;
  panel.openForArtKey(forgeTargetArtKeyForRuntime(artKey));
}
