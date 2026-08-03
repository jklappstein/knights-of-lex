import Phaser from 'phaser';
import type { GamePorts } from '../ports/GamePorts.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'Knights of Lex', {
      fontSize: '32px',
      color: '#f0e6d3',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 50, 'Loading...', {
      fontSize: '16px',
      color: '#a89f91',
    }).setOrigin(0.5);

    this.time.delayedCall(500, () => {
      this.scene.start('MainMenuScene');
    });
  }
}

export function getGamePorts(scene: Phaser.Scene): GamePorts {
  const ports = scene.registry.get('gamePorts') as GamePorts | undefined;
  if (!ports) {
    throw new Error('GamePorts not found in registry');
  }
  return ports;
}
