import Phaser from 'phaser';
import type { BattleView, HeroSnapshot } from '@kol/shared-types';

export class CombatHudPresenter {
  private texts: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  renderParty(party: readonly HeroSnapshot[], screenWidth: number): void {
    this.clear();
    party.forEach((hero, i) => {
      const text = this.scene.add.text(20, 80 + i * 50,
        `${hero.heroId.replace('hero.', '')} HP:${hero.currentHp}/${hero.maxHp} [${hero.formationRank}]`,
        { fontSize: '14px', color: '#f0e6d3' },
      );
      this.texts.push(text);
    });
  }

  renderBattle(battle: BattleView, screenWidth: number): void {
    this.clear();

    this.texts.push(
      this.scene.add.text(screenWidth / 2, 30, '— COMBAT —', {
        fontSize: '18px',
        color: '#c9a959',
      }).setOrigin(0.5),
    );

    battle.enemies.forEach((enemy, i) => {
      const bossTag = enemy.isBoss ? ' [BOSS]' : '';
      this.texts.push(
        this.scene.add.text(20, 60 + i * 30,
          `${enemy.displayName}${bossTag} HP:${enemy.currentHp}/${enemy.maxHp} (${enemy.intentLabel})`,
          { fontSize: '13px', color: enemy.isBoss ? '#e74c3c' : '#e67e22' },
        ),
      );
    });

    battle.heroes.forEach((hero, i) => {
      const active = hero.unitId === battle.currentActorId ? ' ◀' : '';
      const downed = hero.isDowned ? ' [DOWN]' : '';
      this.texts.push(
        this.scene.add.text(20, 160 + i * 28,
          `${hero.heroId.replace('hero.', '')} HP:${hero.currentHp} SH:${hero.shield}${active}${downed}`,
          { fontSize: '12px', color: hero.isDowned ? '#666' : '#4ecdc4' },
        ),
      );
    });

    const order = battle.initiativeOrder
      .map((id) => {
        const hero = battle.heroes.find((h) => h.unitId === id);
        const enemy = battle.enemies.find((e) => e.unitId === id);
        return hero?.heroId.replace('hero.', '') ?? enemy?.displayName ?? id;
      })
      .join(' → ');

    this.texts.push(
      this.scene.add.text(screenWidth / 2, 250, `Initiative: ${order}`, {
        fontSize: '10px',
        color: '#888',
        wordWrap: { width: screenWidth - 20 },
        align: 'center',
      }).setOrigin(0.5, 0),
    );
  }

  clear(): void {
    this.texts.forEach((t) => t.destroy());
    this.texts = [];
  }

  destroy(): void {
    this.clear();
  }
}
