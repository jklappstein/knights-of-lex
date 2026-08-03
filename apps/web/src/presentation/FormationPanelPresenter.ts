import Phaser from 'phaser';
import type { BattleView, HeroSnapshot } from '@kol/shared-types';
import { Layout, UiTheme } from '../ui/UiTheme.js';

interface PanelEntry {
  container: Phaser.GameObjects.Container;
}

export class FormationPanelPresenter {
  private entries: PanelEntry[] = [];
  private header: Phaser.GameObjects.Text | null = null;
  private initiativeBar: Phaser.GameObjects.Text | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  renderBattle(battle: BattleView): void {
    this.clear();

    const { width } = this.scene.scale;

    this.header = this.scene.add.text(width / 2, 16, 'BATTLE', {
      fontSize: '14px',
      color: UiTheme.accentGold,
      fontFamily: UiTheme.fontTitle,
      letterSpacing: 4,
    }).setOrigin(0.5, 0);

    this.renderSidePanel('HEROES', battle.heroes.map((h) => ({
      name: formatHeroName(h.heroId),
      currentHp: h.currentHp,
      maxHp: h.maxHp,
      shield: h.shield,
      isActive: h.unitId === battle.currentActorId,
      isDowned: h.isDowned,
      isBoss: false,
    })), Layout.heroPanelX, Layout.combatTop, UiTheme.heroTint);

    this.renderSidePanel('ENEMIES', battle.enemies.map((e) => ({
      name: e.displayName,
      currentHp: e.currentHp,
      maxHp: e.maxHp,
      shield: e.shield,
      isActive: e.unitId === battle.currentActorId,
      isDowned: e.currentHp <= 0,
      isBoss: e.isBoss,
      subtitle: e.intentLabel,
    })), Layout.enemyPanelX, Layout.combatTop, UiTheme.enemyTint);

    const order = battle.initiativeOrder
      .map((id) => {
        const hero = battle.heroes.find((h) => h.unitId === id);
        const enemy = battle.enemies.find((e) => e.unitId === id);
        if (hero) return formatHeroName(hero.heroId);
        return enemy?.displayName ?? '?';
      })
      .join('  ›  ');

    this.initiativeBar = this.scene.add.text(width / 2, Layout.combatTop + Layout.combatHeight + 4, order, {
      fontSize: '10px',
      color: UiTheme.textMuted,
      fontFamily: UiTheme.fontMono,
      align: 'center',
      wordWrap: { width: width - 24 },
    }).setOrigin(0.5, 0);
  }

  renderParty(party: readonly HeroSnapshot[]): void {
    this.clear();
    this.renderSidePanel('PARTY', party.map((h) => ({
      name: formatHeroName(h.heroId),
      currentHp: h.currentHp,
      maxHp: h.maxHp,
      shield: 0,
      isActive: false,
      isDowned: h.isDowned,
      isBoss: false,
      subtitle: h.formationRank,
    })), Layout.heroPanelX, 120, UiTheme.heroTint);
  }

  private renderSidePanel(
    title: string,
    units: readonly {
      name: string;
      currentHp: number;
      maxHp: number;
      shield: number;
      isActive: boolean;
      isDowned: boolean;
      isBoss: boolean;
      subtitle?: string;
    }[],
    x: number,
    y: number,
    accentColor: string,
  ): void {
    const panelW = title === 'HEROES' ? Layout.heroPanelW : Layout.enemyPanelW;
    const container = this.scene.add.container(x, y);

    const bg = this.scene.add.rectangle(0, 0, panelW, Layout.combatHeight, UiTheme.panel, 0.95);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, UiTheme.panelBorder);
    container.add(bg);

    const titleText = this.scene.add.text(panelW / 2, 8, title, {
      fontSize: '11px',
      color: accentColor,
      fontFamily: UiTheme.fontTitle,
      letterSpacing: 2,
    }).setOrigin(0.5, 0);
    container.add(titleText);

    units.forEach((unit, i) => {
      const rowY = 28 + i * 52;
      const nameColor = unit.isDowned ? UiTheme.textMuted : unit.isBoss ? UiTheme.bossTint : UiTheme.textPrimary;
      const activeMark = unit.isActive ? ' ▶' : '';

      const name = this.scene.add.text(8, rowY, `${unit.name}${activeMark}`, {
        fontSize: '13px',
        color: nameColor,
        fontFamily: UiTheme.fontBody,
        fontStyle: unit.isActive ? 'bold' : 'normal',
      });
      container.add(name);

      if (unit.subtitle) {
        const sub = this.scene.add.text(8, rowY + 16, String(unit.subtitle), {
          fontSize: '10px',
          color: UiTheme.textMuted,
          fontFamily: UiTheme.fontMono,
        });
        container.add(sub);
      }

      const barY = rowY + (unit.subtitle ? 30 : 18);
      const barW = panelW - 16;
      const hpPct = Math.max(0, unit.currentHp / unit.maxHp);

      const barBg = this.scene.add.rectangle(8, barY, barW, 8, 0x2a3545);
      barBg.setOrigin(0, 0);
      container.add(barBg);

      const hpColor = unit.isDowned ? 0x555555 : unit.isBoss ? 0xc0392b : hpPct < 0.3 ? 0xe74c3c : 0x2ecc71;
      const barFill = this.scene.add.rectangle(8, barY, barW * hpPct, 8, hpColor);
      barFill.setOrigin(0, 0);
      container.add(barFill);

      const hpLabel = this.scene.add.text(8, barY + 10, `${unit.currentHp}/${unit.maxHp}${unit.shield > 0 ? ` +${unit.shield}` : ''}`, {
        fontSize: '10px',
        color: UiTheme.textSecondary,
        fontFamily: UiTheme.fontMono,
      });
      container.add(hpLabel);
    });

    this.entries.push({ container });
  }

  clear(): void {
    this.entries.forEach((e) => e.container.destroy());
    this.entries = [];
    this.header?.destroy();
    this.header = null;
    this.initiativeBar?.destroy();
    this.initiativeBar = null;
  }

  destroy(): void {
    this.clear();
  }
}

function formatHeroName(heroId: string): string {
  const raw = heroId.replace('hero.', '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
