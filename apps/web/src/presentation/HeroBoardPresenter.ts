import Phaser from 'phaser';
import type { BoardView, HeroSnapshot, HexCoord } from '@kol/shared-types';

const HEX_SIZE = 22;

function axialToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (3 / 2) * q;
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}

export class HeroBoardPresenter {
  private tiles: Phaser.GameObjects.Container[] = [];
  private tracePath: HexCoord[] = [];
  private onSubmit: ((path: readonly HexCoord[]) => void) | null = null;
  private isTracing = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly symbolColors: Record<string, number>,
    private readonly symbolShapes: Record<string, string>,
  ) {}

  renderBoard(
    board: BoardView,
    hero: HeroSnapshot,
    onSubmit: (path: readonly HexCoord[]) => void,
  ): void {
    this.clear();
    this.onSubmit = onSubmit;
    this.tracePath = [];

    const { width } = this.scene.scale;
    const centerX = width / 2;
    const centerY = 480;

    this.scene.add.text(centerX, 380, `${hero.heroId.replace('hero.', '')}'s Board`, {
      fontSize: '14px',
      color: '#a89f91',
    }).setOrigin(0.5).setName('board-label');

    for (const tile of board.tiles) {
      const pos = axialToPixel(tile.coord.q, tile.coord.r);
      const container = this.scene.add.container(centerX + pos.x, centerY + pos.y);

      const hex = this.scene.add.circle(0, 0, HEX_SIZE - 2, 0x2c3e50, 0.9);
      hex.setStrokeStyle(2, this.symbolColors[tile.combatSymbol] ?? 0xffffff);

      const letter = this.scene.add.text(0, -4, tile.letter, {
        fontSize: '16px',
        color: '#f0e6d3',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      const symbol = this.scene.add.text(0, 10, this.symbolShapes[tile.combatSymbol] ?? '?', {
        fontSize: '10px',
        color: '#ffffff',
      }).setOrigin(0.5);

      container.add([hex, letter, symbol]);
      container.setSize(HEX_SIZE * 2, HEX_SIZE * 2);
      container.setInteractive(
        new Phaser.Geom.Circle(0, 0, HEX_SIZE),
        Phaser.Geom.Circle.Contains,
      );

      const coord = tile.coord;
      container.on('pointerdown', () => this.handleTileTap(coord));
      container.on('pointerover', () => {
        if (this.isTracing) this.handleTileTap(coord);
      });

      container.setData('coord', coord);
      this.tiles.push(container);
    }

    const submitBtn = this.scene.add.text(centerX, centerY + 160, '[ Submit Word ]', {
      fontSize: '16px',
      color: '#4ecdc4',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setName('submit-btn');

    submitBtn.on('pointerdown', () => {
      if (this.tracePath.length >= 3 && this.onSubmit) {
        this.onSubmit(this.tracePath);
        this.tracePath = [];
        this.updateHighlights();
      }
    });

    const clearBtn = this.scene.add.text(centerX, centerY + 190, '[ Clear ]', {
      fontSize: '14px',
      color: '#888',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setName('clear-btn');

    clearBtn.on('pointerdown', () => {
      this.tracePath = [];
      this.updateHighlights();
    });
  }

  private handleTileTap(coord: HexCoord): void {
    const key = `${coord.q},${coord.r}`;
    const existing = this.tracePath.findIndex((c) => `${c.q},${c.r}` === key);

    if (existing >= 0) {
      this.tracePath = this.tracePath.slice(0, existing + 1);
    } else if (this.tracePath.length === 0) {
      this.tracePath = [coord];
      this.isTracing = true;
    } else {
      const last = this.tracePath[this.tracePath.length - 1];
      if (last && this.areAdjacent(last, coord)) {
        this.tracePath = [...this.tracePath, coord];
      }
    }
    this.updateHighlights();
  }

  private areAdjacent(a: HexCoord, b: HexCoord): boolean {
    const dq = Math.abs(a.q - b.q);
    const dr = Math.abs(a.r - b.r);
    const ds = Math.abs(a.q + a.r - b.q - b.r);
    return dq <= 1 && dr <= 1 && ds <= 1 && !(dq === 0 && dr === 0);
  }

  private updateHighlights(): void {
    const pathSet = new Set(this.tracePath.map((c) => `${c.q},${c.r}`));
    for (const container of this.tiles) {
      const coord = container.getData('coord') as HexCoord;
      const hex = container.getAt(0) as Phaser.GameObjects.Arc;
      if (pathSet.has(`${coord.q},${coord.r}`)) {
        hex.setFillStyle(0x4ecdc4, 0.6);
      } else {
        hex.setFillStyle(0x2c3e50, 0.9);
      }
    }

    const word = this.tracePath.map((c) => {
      const tile = this.tiles.find((t) => {
        const tc = t.getData('coord') as HexCoord;
        return tc.q === c.q && tc.r === c.r;
      });
      if (!tile) return '';
      const letter = tile.getAt(1) as Phaser.GameObjects.Text;
      return letter.text;
    }).join('');

    const label = this.scene.children.getByName('word-preview') as Phaser.GameObjects.Text | null;
    if (label) {
      label.setText(word.length > 0 ? word : '');
    } else if (word.length > 0) {
      this.scene.add.text(this.scene.scale.width / 2, 360, word, {
        fontSize: '20px',
        color: '#f1c40f',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setName('word-preview');
    }
  }

  clear(): void {
    this.tiles.forEach((t) => t.destroy());
    this.tiles = [];
    this.tracePath = [];
    this.isTracing = false;
    this.onSubmit = null;
    this.scene.children.getByName('board-label')?.destroy();
    this.scene.children.getByName('submit-btn')?.destroy();
    this.scene.children.getByName('clear-btn')?.destroy();
    this.scene.children.getByName('word-preview')?.destroy();
  }

  destroy(): void {
    this.clear();
  }
}
