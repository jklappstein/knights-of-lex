import Phaser from 'phaser';
import { getGamePorts } from './BootScene.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const ports = getGamePorts(this);

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add.text(width / 2, 120, 'Knights of Lex', {
      fontSize: '36px',
      color: '#f0e6d3',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5).setName('title');

    this.add.text(width / 2, 180, 'Kingdom of Lex', {
      fontSize: '18px',
      color: '#c9a959',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    const startBtn = this.add.text(width / 2, 400, '[ New Run ]', {
      fontSize: '24px',
      color: '#4ecdc4',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerdown', () => {
      ports.dispatch({ type: 'CreateRun', seed: Date.now() % 100000, expectedRevision: 0 });
      this.scene.start('RunScene');
    });

    const testBtn = this.add.text(width / 2, 460, '[ Quick Test Run ]', {
      fontSize: '18px',
      color: '#a89f91',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    testBtn.on('pointerdown', () => {
      const bridge = window.__KOL_TEST__;
      if (bridge) {
        bridge.startRandomizedRun(42);
        this.scene.start('RunScene');
      }
    });

    this.add.text(width / 2, height - 60, 'Trace words. Symbols form actions.', {
      fontSize: '14px',
      color: '#666',
      align: 'center',
      wordWrap: { width: width - 40 },
    }).setOrigin(0.5);
  }
}
