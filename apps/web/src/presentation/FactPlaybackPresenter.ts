import Phaser from 'phaser';
import type { GameFact } from '@kol/shared-types';
import { Layout, UiTheme } from '../ui/UiTheme.js';

export class FactPlaybackPresenter {
  private floatingTexts: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  playFacts(facts: readonly GameFact[]): void {
    let yOffset = 0;
    for (const fact of facts) {
      let message = '';
      let color: string = UiTheme.textPrimary;

      switch (fact.type) {
        case 'WordCommitted':
          message = `${fact.moveName}: ${fact.normalizedWord}`;
          color = UiTheme.accentGold;
          break;
        case 'DamageDealt':
          message = `−${fact.amount} damage`;
          color = UiTheme.danger;
          break;
        case 'ShieldGained':
          message = `+${fact.amount} shield`;
          color = UiTheme.success;
          break;
        case 'HealingApplied':
          message = `+${fact.amount} heal`;
          color = '#3498db';
          break;
        case 'BattleWon':
          message = 'VICTORY!';
          color = UiTheme.accentGold;
          break;
        case 'BattleLost':
          message = 'DEFEAT';
          color = UiTheme.danger;
          break;
        default:
          continue;
      }

      const text = this.scene.add.text(
        this.scene.scale.width / 2,
        Layout.toastY - 40 + yOffset,
        message,
        {
          fontSize: '15px',
          color,
          fontFamily: UiTheme.fontMono,
          backgroundColor: '#1a2332dd',
          padding: { x: 10, y: 4 },
        },
      ).setOrigin(0.5).setDepth(90);

      this.floatingTexts.push(text);
      yOffset += 28;

      this.scene.tweens.add({
        targets: text,
        alpha: 0,
        y: text.y - 20,
        duration: 1800,
        onComplete: () => {
          text.destroy();
          this.floatingTexts = this.floatingTexts.filter((t) => t !== text);
        },
      });
    }
  }

  destroy(): void {
    this.floatingTexts.forEach((t) => t.destroy());
    this.floatingTexts = [];
  }
}
