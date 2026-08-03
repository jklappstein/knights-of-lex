import Phaser from 'phaser';
import type { GameFact } from '@kol/shared-types';

export class FactPlaybackPresenter {
  private floatingTexts: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  playFacts(facts: readonly GameFact[]): void {
    let yOffset = 0;
    for (const fact of facts) {
      let message = '';
      let color = '#ffffff';

      switch (fact.type) {
        case 'WordCommitted':
          message = `${fact.moveName}: ${fact.normalizedWord}`;
          color = '#f1c40f';
          break;
        case 'DamageDealt':
          message = `-${fact.amount} damage`;
          color = '#e74c3c';
          break;
        case 'ShieldGained':
          message = `+${fact.amount} shield`;
          color = '#2ecc71';
          break;
        case 'HealingApplied':
          message = `+${fact.amount} heal`;
          color = '#3498db';
          break;
        case 'BattleWon':
          message = 'VICTORY!';
          color = '#f1c40f';
          break;
        case 'BattleLost':
          message = 'DEFEAT';
          color = '#e74c3c';
          break;
        default:
          continue;
      }

      const text = this.scene.add.text(
        this.scene.scale.width / 2,
        300 + yOffset,
        message,
        { fontSize: '16px', color, fontFamily: 'monospace' },
      ).setOrigin(0.5);

      this.floatingTexts.push(text);
      yOffset += 24;

      this.scene.tweens.add({
        targets: text,
        alpha: 0,
        y: text.y - 30,
        duration: 1500,
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
