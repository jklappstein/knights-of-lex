import Phaser from 'phaser';
import type { BoardView, HeroSnapshot, RunView } from '@kol/shared-types';
import type { GamePorts } from '../ports/GamePorts.js';
import { getGamePorts } from './BootScene.js';
import { HeroBoardPresenter } from '../presentation/HeroBoardPresenter.js';
import { CombatHudPresenter } from '../presentation/CombatHudPresenter.js';
import { FactPlaybackPresenter } from '../presentation/FactPlaybackPresenter.js';

const SYMBOL_COLORS: Record<string, number> = {
  strike: 0xe74c3c,
  shot: 0x3498db,
  spark: 0x9b59b6,
  guard: 0x2ecc71,
  heal: 0xf1c40f,
};

const SYMBOL_SHAPES: Record<string, string> = {
  strike: '⚔',
  shot: '🏹',
  spark: '✦',
  guard: '🛡',
  heal: '✚',
};

export class RunScene extends Phaser.Scene {
  private ports: GamePorts | null = null;
  private boardPresenter: HeroBoardPresenter | null = null;
  private hudPresenter: CombatHudPresenter | null = null;
  private factPresenter: FactPlaybackPresenter | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;
  private actionButtons: Phaser.GameObjects.Text[] = [];
  private dynamicObjects: Phaser.GameObjects.GameObject[] = [];
  private lastRenderKey = '';

  constructor() {
    super({ key: 'RunScene' });
  }

  create(): void {
    this.ports = getGamePorts(this);
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x16213e);

    this.hudPresenter = new CombatHudPresenter(this);
    this.boardPresenter = new HeroBoardPresenter(this, SYMBOL_COLORS, SYMBOL_SHAPES);
    this.factPresenter = new FactPlaybackPresenter(this);

    this.statusText = this.add.text(width / 2, height - 30, '', {
      fontSize: '12px',
      color: '#888',
    }).setOrigin(0.5);

    this.renderCurrentState();
  }

  update(): void {
    const view = this.ports?.getView();
    const key = view
      ? `${view.phase}:${view.revision}:${view.battle?.phase ?? 'none'}:${view.battle?.currentActorId ?? 'none'}`
      : 'none';
    if (key !== this.lastRenderKey) {
      this.renderCurrentState();
    }
  }

  shutdown(): void {
    this.boardPresenter?.destroy();
    this.hudPresenter?.destroy();
    this.factPresenter?.destroy();
    this.actionButtons.forEach((b) => b.destroy());
    this.actionButtons = [];
    this.boardPresenter = null;
    this.hudPresenter = null;
    this.factPresenter = null;
    this.ports = null;
  }

  private renderCurrentState(): void {
    if (!this.ports) return;
    const view = this.ports.getView();
    const key = view
      ? `${view.phase}:${view.revision}:${view.battle?.phase ?? 'none'}:${view.battle?.currentActorId ?? 'none'}`
      : 'none';
    this.lastRenderKey = key;

    if (!view) {
      this.showHeroSelection(null);
      return;
    }

    switch (view.phase) {
      case 'HeroSelection':
        this.showHeroSelection(view);
        break;
      case 'Formation':
        this.showFormation(view);
        break;
      case 'Encounter':
        this.showEncounter(view);
        break;
      case 'Intermission':
        this.showIntermission(view);
        break;
      case 'ActComplete':
        this.showVictory(view);
        break;
      case 'RunDefeat':
        this.showDefeat(view);
        break;
      default:
        this.statusText?.setText(`Phase: ${view.phase}`);
    }
  }

  private clearButtons(): void {
    this.actionButtons.forEach((b) => b.destroy());
    this.actionButtons = [];
    this.dynamicObjects.forEach((o) => o.destroy());
    this.dynamicObjects = [];
    this.boardPresenter?.clear();
    this.hudPresenter?.clear();
  }

  private trackDynamic(obj: Phaser.GameObjects.GameObject): void {
    this.dynamicObjects.push(obj);
  }

  private showHeroSelection(view: RunView | null): void {
    this.clearButtons();
    this.boardPresenter?.clear();
    this.hudPresenter?.clear();

    const { width } = this.scale;
    this.add.text(width / 2, 200, 'Choose Starting Knight', {
      fontSize: '22px',
      color: '#f0e6d3',
    }).setOrigin(0.5);

    const heroes = [
      'hero.vanguard', 'hero.ranger', 'hero.cleric', 'hero.corsair',
      'hero.skirmisher', 'hero.valkyrie', 'hero.spellblade', 'hero.paladin',
      'hero.spellbow', 'hero.druid',
    ];

    heroes.forEach((heroId, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = width / 2 + (col === 0 ? -90 : 90);
      const y = 280 + row * 40;
      const name = heroId.replace('hero.', '');
      const btn = this.add.text(x, y, name, {
        fontSize: '16px',
        color: '#4ecdc4',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        const revision = this.ports?.getView()?.revision ?? 1;
        this.ports?.dispatch({ type: 'ChooseStartingHero', heroId, expectedRevision: revision });
      });
      this.actionButtons.push(btn);
    });
  }

  private showFormation(view: RunView): void {
    this.clearButtons();
    this.boardPresenter?.clear();

    const { width } = this.scale;
    this.hudPresenter?.renderParty(view.party, width);

    const recruitBtn = this.add.text(width / 2, 500, '[ Recruit Heroes ]', {
      fontSize: '18px',
      color: '#4ecdc4',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    recruitBtn.on('pointerdown', () => {
      const recruits = ['hero.ranger', 'hero.cleric', 'hero.paladin', 'hero.druid']
        .filter((id) => !view.party.some((h) => h.heroId === id));
      for (const heroId of recruits.slice(0, 3 - view.party.length)) {
        const revision = this.ports?.getView()?.revision ?? view.revision;
        this.ports?.dispatch({ type: 'RecruitHero', heroId, expectedRevision: revision });
      }
    });
    this.actionButtons.push(recruitBtn);

    if (view.party.length >= 1) {
      const startBtn = this.add.text(width / 2, 560, '[ Begin Adventure ]', {
        fontSize: '20px',
        color: '#f1c40f',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      startBtn.on('pointerdown', () => {
        const revision = this.ports?.getView()?.revision ?? view.revision;
        const assignments: Record<string, 'front' | 'back'> = {};
        view.party.forEach((h, i) => {
          assignments[h.heroId] = i === 0 ? 'front' : i === 1 ? 'front' : 'back';
        });
        this.ports?.dispatch({ type: 'SetFormation', assignments, expectedRevision: revision });
        this.ports?.dispatch({
          type: 'StartEncounter',
          expectedRevision: (this.ports?.getView()?.revision ?? revision),
        });
      });
      this.actionButtons.push(startBtn);
    }
  }

  private showEncounter(view: RunView): void {
    this.clearButtons();
    const { width } = this.scale;

    if (!view.battle) {
      const startBtn = this.add.text(width / 2, 400, '[ Start Encounter ]', {
        fontSize: '20px',
        color: '#4ecdc4',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      startBtn.on('pointerdown', () => {
        this.ports?.dispatch({ type: 'StartEncounter', expectedRevision: view.revision });
      });
      this.actionButtons.push(startBtn);
      return;
    }

    this.hudPresenter?.renderBattle(view.battle, width);
    this.renderActiveBoard(view);

    if (view.battle.phase === 'EnemyTurnReady') {
      const enemyBtn = this.add.text(width / 2, 700, '[ Resolve Enemy Turn ]', {
        fontSize: '16px',
        color: '#e74c3c',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      enemyBtn.on('pointerdown', () => {
        this.ports?.dispatch({ type: 'ResolveEnemyTurn', expectedRevision: view.revision });
      });
      this.actionButtons.push(enemyBtn);
    }

    if (view.battle.phase === 'Victory') {
      this.statusText?.setText('Victory! Healing party...');
    }
  }

  private renderActiveBoard(view: RunView): void {
    if (!view.battle || !this.boardPresenter || !this.ports) return;

    const currentActorId = view.battle.currentActorId;
    const activeHero = view.battle.heroes.find((h) => h.unitId === currentActorId);
    if (!activeHero) {
      this.boardPresenter.clear();
      return;
    }

    const board = view.battle.boards.find((b) => b.heroId === activeHero.heroId);
    if (!board) return;

    this.boardPresenter.renderBoard(board, activeHero, (path) => {
      const currentView = this.ports?.getView();
      if (!currentView?.battle) return;
      const outcome = this.ports?.dispatch({
        type: 'SubmitWord',
        heroId: activeHero.heroId,
        path,
        boardRevision: board.revision,
        expectedRevision: currentView.revision,
      });
      if (outcome?.facts) {
        this.factPresenter?.playFacts(outcome.facts);
      }
    });
  }

  private showIntermission(view: RunView): void {
    this.clearButtons();
    this.boardPresenter?.clear();
    const { width } = this.scale;

    this.add.text(width / 2, 300, 'Intermission — Town of Lex', {
      fontSize: '22px',
      color: '#f0e6d3',
    }).setOrigin(0.5);

    this.add.text(width / 2, 340, `Gold: ${view.gold}`, {
      fontSize: '16px',
      color: '#c9a959',
    }).setOrigin(0.5);

    const continueBtn = this.add.text(width / 2, 420, '[ Continue ]', {
      fontSize: '20px',
      color: '#4ecdc4',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    continueBtn.on('pointerdown', () => {
      this.ports?.dispatch({ type: 'LeaveIntermission', expectedRevision: view.revision });
      const rev = this.ports?.getView()?.revision ?? view.revision + 1;
      this.ports?.dispatch({ type: 'StartEncounter', expectedRevision: rev });
    });
    this.actionButtons.push(continueBtn);
  }

  private showVictory(view: RunView): void {
    this.clearButtons();
    this.boardPresenter?.clear();
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2 - 40, 'ACT COMPLETE!', {
      fontSize: '32px',
      color: '#f1c40f',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 20, `The Zed King has fallen.\nGold earned: ${view.gold}`, {
      fontSize: '16px',
      color: '#f0e6d3',
      align: 'center',
    }).setOrigin(0.5);
  }

  private showDefeat(view: RunView): void {
    this.clearButtons();
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2, 'DEFEAT', {
      fontSize: '32px',
      color: '#e74c3c',
    }).setOrigin(0.5);
  }
}
