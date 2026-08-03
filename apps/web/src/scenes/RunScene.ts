import Phaser from 'phaser';
import type { RunView } from '@kol/shared-types';
import type { GamePorts } from '../ports/GamePorts.js';
import { getGamePorts } from './BootScene.js';
import { HeroBoardPresenter } from '../presentation/HeroBoardPresenter.js';
import { FormationPanelPresenter } from '../presentation/FormationPanelPresenter.js';
import { FactPlaybackPresenter } from '../presentation/FactPlaybackPresenter.js';
import { ToastPresenter } from '../ui/ToastPresenter.js';
import { UiTheme } from '../ui/UiTheme.js';

export class RunScene extends Phaser.Scene {
  private ports: GamePorts | null = null;
  private boardPresenter: HeroBoardPresenter | null = null;
  private formationPresenter: FormationPanelPresenter | null = null;
  private factPresenter: FactPlaybackPresenter | null = null;
  private toast: ToastPresenter | null = null;

  private uiLayer: Phaser.GameObjects.Container | null = null;
  private lastPhaseKey = '';
  private lastBoardKey = '';
  private lastBattleHudKey = '';

  constructor() {
    super({ key: 'RunScene' });
  }

  create(): void {
    this.ports = getGamePorts(this);
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, UiTheme.bg);

    this.uiLayer = this.add.container(0, 0);
    this.formationPresenter = new FormationPanelPresenter(this);
    this.boardPresenter = new HeroBoardPresenter(this);
    this.factPresenter = new FactPlaybackPresenter(this);
    this.toast = new ToastPresenter(this);

    const service = this.registry.get('gameService') as {
      previewWord: (
        heroId: string,
        path: readonly { q: number; r: number }[],
        boardRevision: number,
      ) => { moveName: string; normalizedWord: string } | { rejected: true; code: string } | null;
    };

    this.boardPresenter.bindPreviewPort({
      previewWord: (heroId, path, boardRevision) => {
        const result = service.previewWord(heroId, path, boardRevision);
        if (!result) return null;
        if ('rejected' in result) return { rejected: result.code };
        return { moveName: result.moveName, normalizedWord: result.normalizedWord };
      },
    });

    this.renderPhase();
  }

  update(): void {
    this.renderPhase();
  }

  shutdown(): void {
    this.clearUiLayer();
    this.boardPresenter?.destroy();
    this.formationPresenter?.destroy();
    this.factPresenter?.destroy();
    this.toast?.destroy();
    this.boardPresenter = null;
    this.formationPresenter = null;
    this.factPresenter = null;
    this.toast = null;
    this.ports = null;
    this.uiLayer = null;
  }

  private renderPhase(): void {
    if (!this.ports) return;
    const view = this.ports.getView();

    const phaseKey = view
      ? `${view.phase}:${view.revision}`
      : 'none';

    if (phaseKey !== this.lastPhaseKey) {
      this.lastPhaseKey = phaseKey;
      this.lastBoardKey = '';
      this.lastBattleHudKey = '';
      this.clearUiLayer();
      this.formationPresenter?.clear();
      this.boardPresenter?.clear();

      if (!view) return;

      switch (view.phase) {
        case 'HeroSelection':
          this.renderHeroSelection();
          break;
        case 'Formation':
          this.formationPresenter?.renderParty(view.party);
          this.renderFormationControls(view);
          break;
        case 'Encounter':
          this.renderEncounter(view);
          break;
        case 'Intermission':
          this.renderIntermission(view);
          break;
        case 'ActComplete':
          this.renderVictory(view);
          break;
        case 'RunDefeat':
          this.renderDefeat();
          break;
      }
      return;
    }

    if (view?.phase === 'Encounter' && view.battle) {
      this.renderEncounterDynamic(view);
    }
  }

  private renderEncounterDynamic(view: RunView): void {
    if (!view.battle) return;

    const battleHudKey = `${view.battle.revision}:${view.battle.phase}:${view.battle.currentActorId}:${view.battle.heroes.map((h) => h.currentHp).join(',')}:${view.battle.enemies.map((e) => e.currentHp).join(',')}`;

    if (battleHudKey !== this.lastBattleHudKey) {
      this.lastBattleHudKey = battleHudKey;
      this.formationPresenter?.renderBattle(view.battle);
    }

    const currentActorId = view.battle.currentActorId;
    const activeHero = view.battle.heroes.find((h) => h.unitId === currentActorId);
    const activeBoard = activeHero
      ? view.battle.boards.find((b) => b.heroId === activeHero.heroId)
      : null;

    const boardKey = activeBoard
      ? `${activeHero?.heroId}:${activeBoard.revision}:${view.battle.phase}`
      : 'none';

    if (boardKey !== this.lastBoardKey) {
      this.lastBoardKey = boardKey;
      if (view.battle.phase === 'HeroTurnAwaitingWord' && activeHero && activeBoard) {
        this.renderActiveBoard(view);
      } else {
        this.boardPresenter?.clear();
      }
    }

    this.updateEnemyTurnButton(view);
  }

  private renderEncounter(view: RunView): void {
    if (!view.battle) {
      this.addUiText(this.scale.width / 2, 400, 'Start Encounter', UiTheme.accent, () => {
        this.ports?.dispatch({ type: 'StartEncounter', expectedRevision: view.revision });
      });
      return;
    }
    this.renderEncounterDynamic(view);
  }

  private enemyTurnBtn: Phaser.GameObjects.Text | null = null;

  private updateEnemyTurnButton(view: RunView): void {
    this.enemyTurnBtn?.destroy();
    this.enemyTurnBtn = null;

    if (view.battle?.phase === 'EnemyTurnReady') {
      this.enemyTurnBtn = this.addUiText(
        this.scale.width / 2, 760,
        'Enemy Turn — Tap to Continue',
        UiTheme.danger,
        () => {
          const rev = this.ports?.getView()?.revision ?? view.revision;
          this.ports?.dispatch({ type: 'ResolveEnemyTurn', expectedRevision: rev });
        },
      );
    }
  }

  private renderActiveBoard(view: RunView): void {
    if (!view.battle || !this.boardPresenter || !this.ports) return;

    const currentActorId = view.battle.currentActorId;
    const activeHero = view.battle.heroes.find((h) => h.unitId === currentActorId);
    if (!activeHero || activeHero.isDowned) {
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

        if (outcome?.ok && outcome.facts.length > 0) {
          this.factPresenter?.playFacts(outcome.facts);
          this.lastPhaseKey = '';
          this.lastBoardKey = '';
        } else if (!outcome?.ok) {
          const msg = outcome?.message ?? outcome?.code ?? 'Word rejected';
          this.boardPresenter?.showSubmitResult(false, msg);
          this.toast?.show(msg, UiTheme.danger);
        }
    });
  }

  private renderHeroSelection(): void {
    const { width } = this.scale;
    this.addUiLabel(width / 2, 100, 'Choose Your Knight', 24, UiTheme.textPrimary);

    const heroes = [
      'hero.vanguard', 'hero.ranger', 'hero.cleric', 'hero.corsair',
      'hero.skirmisher', 'hero.valkyrie', 'hero.spellblade', 'hero.paladin',
      'hero.spellbow', 'hero.druid',
    ];

    heroes.forEach((heroId, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = width / 2 + (col === 0 ? -85 : 85);
      const y = 180 + row * 44;
      const name = heroId.replace('hero.', '');
      this.addUiText(x, y, name, UiTheme.accent, () => {
        const revision = this.ports?.getView()?.revision ?? 1;
        this.ports?.dispatch({ type: 'ChooseStartingHero', heroId, expectedRevision: revision });
      });
    });
  }

  private renderFormationControls(view: RunView): void {
    const { width } = this.scale;
    this.addUiLabel(width / 2, 60, 'Assemble Your Party', 20, UiTheme.textPrimary);

    this.addUiText(width / 2, 340, 'Recruit Heroes', UiTheme.accent, () => {
      const recruits = ['hero.ranger', 'hero.cleric', 'hero.paladin', 'hero.druid', 'hero.corsair']
        .filter((id) => !view.party.some((h) => h.heroId === id));
      let revision = this.ports?.getView()?.revision ?? view.revision;
      for (const heroId of recruits.slice(0, 3 - view.party.length)) {
        this.ports?.dispatch({ type: 'RecruitHero', heroId, expectedRevision: revision });
        revision = this.ports?.getView()?.revision ?? revision + 1;
      }
      this.lastPhaseKey = '';
    });

    if (view.party.length >= 1) {
      this.addUiText(width / 2, 400, 'Begin Adventure', UiTheme.accentGold, () => {
        let revision = this.ports?.getView()?.revision ?? view.revision;
        const assignments: Record<string, 'front' | 'back'> = {};
        view.party.forEach((h, i) => {
          assignments[h.heroId] = i < 2 ? 'front' : 'back';
        });
        this.ports?.dispatch({ type: 'SetFormation', assignments, expectedRevision: revision });
        revision = this.ports?.getView()?.revision ?? revision + 1;
        this.ports?.dispatch({ type: 'StartEncounter', expectedRevision: revision });
        this.lastPhaseKey = '';
        this.lastBoardKey = '';
      });
    }
  }

  private renderIntermission(view: RunView): void {
    const { width } = this.scale;
    this.addUiLabel(width / 2, 300, 'Town of Lex', 22, UiTheme.textPrimary);
    this.addUiLabel(width / 2, 340, `Gold: ${view.gold}`, 16, UiTheme.accentGold);
    this.addUiText(width / 2, 400, 'Continue to Next Fight', UiTheme.accent, () => {
      let revision = view.revision;
      this.ports?.dispatch({ type: 'LeaveIntermission', expectedRevision: revision });
      revision = this.ports?.getView()?.revision ?? revision + 1;
      this.ports?.dispatch({ type: 'StartEncounter', expectedRevision: revision });
      this.lastPhaseKey = '';
    });
  }

  private renderVictory(view: RunView): void {
    const { width, height } = this.scale;
    this.addUiLabel(width / 2, height / 2 - 50, 'ACT COMPLETE', 28, UiTheme.accentGold);
    this.addUiLabel(width / 2, height / 2, 'The Zed King has fallen', 16, UiTheme.textPrimary);
    this.addUiLabel(width / 2, height / 2 + 30, `Gold: ${view.gold}`, 14, UiTheme.textSecondary);
  }

  private renderDefeat(): void {
    const { width, height } = this.scale;
    this.addUiLabel(width / 2, height / 2, 'DEFEAT', 28, UiTheme.danger);
  }

  private uiObjects: Phaser.GameObjects.GameObject[] = [];

  private clearUiLayer(): void {
    this.uiObjects.forEach((o) => o.destroy());
    this.uiObjects = [];
    this.enemyTurnBtn = null;
  }

  private addUiLabel(x: number, y: number, text: string, size: number, color: string): Phaser.GameObjects.Text {
    const label = this.add.text(x, y, text, {
      fontSize: `${size}px`,
      color,
      fontFamily: UiTheme.fontTitle,
    }).setOrigin(0.5);
    this.uiObjects.push(label);
    return label;
  }

  private addUiText(
    x: number,
    y: number,
    text: string,
    color: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const btn = this.add.text(x, y, text, {
      fontSize: '16px',
      color: '#0f1419',
      fontFamily: UiTheme.fontBody,
      backgroundColor: color,
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', onClick);
    this.uiObjects.push(btn);
    return btn;
  }
}
