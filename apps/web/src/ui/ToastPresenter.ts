import Phaser from 'phaser';
import { Layout, UiTheme } from './UiTheme.js';

export class ToastPresenter {
  private current: Phaser.GameObjects.Text | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  show(message: string, color: string = UiTheme.textPrimary): void {
    this.dismiss();
    const { width } = this.scene.scale;
    this.current = this.scene.add.text(width / 2, Layout.toastY, message, {
      fontSize: '15px',
      color,
      fontFamily: UiTheme.fontBody,
      backgroundColor: '#1a2332cc',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(100);

    this.timer = this.scene.time.delayedCall(2500, () => this.dismiss());
  }

  dismiss(): void {
    this.timer?.remove();
    this.timer = null;
    this.current?.destroy();
    this.current = null;
  }

  destroy(): void {
    this.dismiss();
  }
}
