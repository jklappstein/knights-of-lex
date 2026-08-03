import Phaser from 'phaser';
import type { BoardView, HeroSnapshot, HexCoord } from '@kol/shared-types';
import {
  HEX_SIZE,
  areAdjacent,
  axialToPixel,
  buildTraceLetters,
  coordKey,
  findNearestTile,
  findNeighborUnderPointer,
  hexVertices,
  type TracePreview,
} from '../ui/HexGeometry.js';
import { Layout, SymbolColors, SymbolGlyphs, UiTheme } from '../ui/UiTheme.js';

export interface WordPreviewPort {
  previewWord(
    heroId: string,
    path: readonly HexCoord[],
    boardRevision: number,
  ): { moveName: string; normalizedWord: string } | { rejected: string } | null;
}

interface TileVisual {
  container: Phaser.GameObjects.Container;
  hexGfx: Phaser.GameObjects.Graphics;
  coord: HexCoord;
  letter: string;
  symbol: string;
}

export class HeroBoardPresenter {
  private root: Phaser.GameObjects.Container | null = null;
  private tiles: TileVisual[] = [];
  private tracePath: HexCoord[] = [];
  private traceLine: Phaser.GameObjects.Graphics | null = null;
  private wordPreviewText: Phaser.GameObjects.Text | null = null;
  private movePreviewText: Phaser.GameObjects.Text | null = null;
  private submitBtn: Phaser.GameObjects.Text | null = null;
  private clearBtn: Phaser.GameObjects.Text | null = null;
  private boardLabel: Phaser.GameObjects.Text | null = null;

  private letterMap = new Map<string, string>();
  private tileCoordMap = new Map<string, HexCoord>();
  private boardCenterX = 0;
  private boardCenterY = 0;
  private isTracing = false;
  private boundBoardKey = '';
  private onSubmit: ((path: readonly HexCoord[]) => void) | null = null;
  private previewPort: WordPreviewPort | null = null;
  private activeHeroId = '';
  private boardRevision = 0;

  private pointerMoveHandler = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isTracing) return;
    this.handlePointerAt(pointer.worldX, pointer.worldY);
  };

  private pointerUpHandler = (): void => {
    this.isTracing = false;
  };

  constructor(private readonly scene: Phaser.Scene) {}

  bindPreviewPort(port: WordPreviewPort): void {
    this.previewPort = port;
  }

  /**
   * Only rebuilds tile visuals when board revision changes.
   * Trace state is preserved across preview updates.
   */
  renderBoard(
    board: BoardView,
    hero: HeroSnapshot,
    onSubmit: (path: readonly HexCoord[]) => void,
  ): void {
    const boardKey = `${board.heroId}:${board.revision}`;
    this.onSubmit = onSubmit;
    this.activeHeroId = hero.heroId;
    this.boardRevision = board.revision;

    if (boardKey !== this.boundBoardKey) {
      this.rebuildTiles(board, hero);
      this.boundBoardKey = boardKey;
      this.tracePath = [];
    }

    this.updateTraceVisuals();
  }

  private rebuildTiles(board: BoardView, hero: HeroSnapshot): void {
    this.destroyBoardGraphics();

    const { width } = this.scene.scale;
    this.boardCenterX = width / 2;
    this.boardCenterY = Layout.boardCenterY;

    this.root = this.scene.add.container(0, 0);
    this.traceLine = this.scene.add.graphics();
    this.root.add(this.traceLine);

    this.letterMap.clear();
    this.tileCoordMap.clear();
    this.tiles = [];

    this.boardLabel = this.scene.add.text(width / 2, Layout.boardLabelY,
      `${formatHeroName(hero.heroId)} — trace a word`, {
        fontSize: '13px',
        color: UiTheme.textSecondary,
        fontFamily: UiTheme.fontBody,
      }).setOrigin(0.5);

    this.wordPreviewText = this.scene.add.text(width / 2, Layout.wordPreviewY, '—', {
      fontSize: '22px',
      color: UiTheme.accentGold,
      fontFamily: UiTheme.fontMono,
    }).setOrigin(0.5);

    this.movePreviewText = this.scene.add.text(width / 2, Layout.wordPreviewY + 24, '', {
      fontSize: '12px',
      color: UiTheme.textMuted,
      fontFamily: UiTheme.fontBody,
    }).setOrigin(0.5);

    for (const tile of board.tiles) {
      const key = coordKey(tile.coord);
      this.letterMap.set(key, tile.letter);
      this.tileCoordMap.set(key, tile.coord);

      const pos = axialToPixel(tile.coord.q, tile.coord.r);
      const container = this.scene.add.container(
        this.boardCenterX + pos.x,
        this.boardCenterY + pos.y,
      );

      const hexGfx = this.scene.add.graphics();
      this.drawHex(hexGfx, SymbolColors[tile.combatSymbol] ?? UiTheme.hexStroke, UiTheme.hexFill);
      container.add(hexGfx);

      const letter = this.scene.add.text(0, -6, tile.letter, {
        fontSize: '17px',
        color: UiTheme.textPrimary,
        fontFamily: UiTheme.fontMono,
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const symbol = this.scene.add.text(0, 12, SymbolGlyphs[tile.combatSymbol] ?? '?', {
        fontSize: '11px',
        color: '#ffffff',
      }).setOrigin(0.5);

      container.add([letter, symbol]);
      container.setSize(HEX_SIZE * 2, HEX_SIZE * 2);
      container.setInteractive(
        new Phaser.Geom.Circle(0, 0, HEX_SIZE * 0.92),
        Phaser.Geom.Circle.Contains,
      );

      const coord = tile.coord;
      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.isTracing = true;
        if (this.tracePath.length === 0) {
          this.handleTileSelect(coord);
        } else {
          const last = this.tracePath[this.tracePath.length - 1];
          if (last && areAdjacent(last, coord)) {
            this.handleTileSelect(coord);
          }
        }
        pointer.event?.preventDefault();
      });

      container.on('pointerover', (pointer: Phaser.Input.Pointer) => {
        if (!this.isTracing || !pointer.isDown) return;
        this.handlePointerAt(pointer.worldX, pointer.worldY);
      });

      this.tiles.push({ container, hexGfx, coord, letter: tile.letter, symbol: tile.combatSymbol });
      this.root.add(container);
    }

    this.submitBtn = this.scene.add.text(width / 2 - 60, Layout.actionBarY, 'Submit', {
      fontSize: '16px',
      color: '#0f1419',
      fontFamily: UiTheme.fontBody,
      backgroundColor: UiTheme.accent,
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.clearBtn = this.scene.add.text(width / 2 + 60, Layout.actionBarY, 'Clear', {
      fontSize: '16px',
      color: UiTheme.textSecondary,
      fontFamily: UiTheme.fontBody,
      backgroundColor: '#2a3545',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.submitBtn.on('pointerdown', () => this.submitTrace());
    this.clearBtn.on('pointerdown', () => this.clearTrace());

    this.scene.input.on('pointermove', this.pointerMoveHandler);
    this.scene.input.on('pointerup', this.pointerUpHandler);
  }

  private drawHex(gfx: Phaser.GameObjects.Graphics, strokeColor: number, fillColor: number, fillAlpha = 0.95): void {
    const verts = hexVertices(HEX_SIZE);
    gfx.clear();
    gfx.fillStyle(fillColor, fillAlpha);
    gfx.lineStyle(2, strokeColor, 1);
    gfx.beginPath();
    gfx.moveTo(verts[0]?.x ?? 0, verts[0]?.y ?? 0);
    for (let i = 1; i < verts.length; i++) {
      const v = verts[i];
      if (v) gfx.lineTo(v.x, v.y);
    }
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();
  }

  private handlePointerAt(worldX: number, worldY: number): void {
    if (this.tracePath.length === 0) {
      const coord = findNearestTile(worldX, worldY, this.boardCenterX, this.boardCenterY, this.tileCoordMap);
      if (coord) this.handleTileSelect(coord);
      return;
    }

    const last = this.tracePath[this.tracePath.length - 1];
    if (!last) return;

    const coord = findNeighborUnderPointer(
      worldX,
      worldY,
      this.boardCenterX,
      this.boardCenterY,
      last,
      this.tileCoordMap,
    );
    if (coord) this.handleTileSelect(coord);
  }

  private handleTileSelect(coord: HexCoord): void {
    const key = coordKey(coord);
    const existing = this.tracePath.findIndex((c) => coordKey(c) === key);

    if (existing >= 0) {
      this.tracePath = this.tracePath.slice(0, existing + 1);
    } else if (this.tracePath.length === 0) {
      this.tracePath = [coord];
    } else {
      const last = this.tracePath[this.tracePath.length - 1];
      if (last && areAdjacent(last, coord)) {
        this.tracePath = [...this.tracePath, coord];
      }
    }
    this.updateTraceVisuals();
  }

  private clearTrace(): void {
    this.tracePath = [];
    this.isTracing = false;
    this.updateTraceVisuals();
  }

  private submitTrace(): void {
    if (this.tracePath.length < 3 || !this.onSubmit) return;
    this.onSubmit(this.tracePath);
    this.tracePath = [];
    this.isTracing = false;
    this.updateTraceVisuals();
  }

  private updateTraceVisuals(): void {
    const pathSet = new Set(this.tracePath.map(coordKey));

    for (const tile of this.tiles) {
      const key = coordKey(tile.coord);
      const isInPath = pathSet.has(key);
      const stroke = SymbolColors[tile.symbol] ?? UiTheme.hexStroke;
      const fill = isInPath ? UiTheme.hexFillTrace : UiTheme.hexFill;
      this.drawHex(tile.hexGfx, stroke, fill, isInPath ? 1 : 0.95);
    }

    if (this.traceLine) {
      this.traceLine.clear();
      if (this.tracePath.length > 1) {
        this.traceLine.lineStyle(3, 0x4ecdc4, 0.8);
        this.traceLine.beginPath();
        const first = this.tracePath[0];
        if (first) {
          const p0 = axialToPixel(first.q, first.r);
          this.traceLine.moveTo(this.boardCenterX + p0.x, this.boardCenterY + p0.y);
          for (let i = 1; i < this.tracePath.length; i++) {
            const c = this.tracePath[i];
            if (!c) continue;
            const p = axialToPixel(c.q, c.r);
            this.traceLine.lineTo(this.boardCenterX + p.x, this.boardCenterY + p.y);
          }
        }
        this.traceLine.strokePath();
      }
    }

    const letters = buildTraceLetters(this.tracePath, this.letterMap);
    const preview = this.computePreview(letters);
    this.renderPreviewText(letters, preview);
  }

  private computePreview(letters: string): TracePreview {
    if (letters.length === 0) {
      return { letters: '', isValidLength: false, isValidWord: false, moveName: null };
    }
    if (!this.previewPort || letters.length < 3) {
      return { letters, isValidLength: letters.length >= 3, isValidWord: false, moveName: null };
    }
    const result = this.previewPort.previewWord(this.activeHeroId, this.tracePath, this.boardRevision);
    if (!result) {
      return { letters, isValidLength: letters.length >= 3, isValidWord: false, moveName: null };
    }
    if ('rejected' in result) {
      return { letters, isValidLength: letters.length >= 3, isValidWord: false, moveName: null };
    }
    return { letters, isValidLength: true, isValidWord: true, moveName: result.moveName };
  }

  private renderPreviewText(letters: string, preview: TracePreview): void {
    if (!this.wordPreviewText || !this.movePreviewText) return;

    if (letters.length === 0) {
      this.wordPreviewText.setText('—');
      this.wordPreviewText.setColor(UiTheme.textMuted);
      this.movePreviewText.setText('Drag across adjacent hexes');
      return;
    }

    this.wordPreviewText.setText(letters);

    if (preview.isValidWord && preview.moveName) {
      this.wordPreviewText.setColor(UiTheme.success);
      this.movePreviewText.setText(`▸ ${preview.moveName}`);
      this.movePreviewText.setColor(UiTheme.accent);
    } else if (letters.length < 3) {
      this.wordPreviewText.setColor(UiTheme.textSecondary);
      this.movePreviewText.setText(`Need ${3 - letters.length} more letter(s)`);
      this.movePreviewText.setColor(UiTheme.textMuted);
    } else {
      this.wordPreviewText.setColor(UiTheme.danger);
      this.movePreviewText.setText('Not in dictionary');
      this.movePreviewText.setColor(UiTheme.danger);
    }
  }

  showSubmitResult(ok: boolean, message: string): void {
    if (!this.movePreviewText) return;
    this.movePreviewText.setText(message);
    this.movePreviewText.setColor(ok ? UiTheme.success : UiTheme.danger);
  }

  clear(): void {
    this.scene.input.off('pointermove', this.pointerMoveHandler);
    this.scene.input.off('pointerup', this.pointerUpHandler);
    this.destroyBoardGraphics();
    this.tracePath = [];
    this.isTracing = false;
    this.boundBoardKey = '';
    this.onSubmit = null;
  }

  private destroyBoardGraphics(): void {
    this.tiles.forEach((t) => t.container.destroy());
    this.tiles = [];
    this.traceLine?.destroy();
    this.traceLine = null;
    this.root?.destroy();
    this.root = null;
    this.boardLabel?.destroy();
    this.boardLabel = null;
    this.wordPreviewText?.destroy();
    this.wordPreviewText = null;
    this.movePreviewText?.destroy();
    this.movePreviewText = null;
    this.submitBtn?.destroy();
    this.submitBtn = null;
    this.clearBtn?.destroy();
    this.clearBtn = null;
  }

  destroy(): void {
    this.clear();
  }
}

function formatHeroName(heroId: string): string {
  const raw = heroId.replace('hero.', '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
