import Phaser from 'phaser';
import { BUNDLED_CONTENT } from '@kol/content-runtime';
import { createLexiconRuntime, DEFAULT_SEMANTIC_AFFINITIES, DEFAULT_WORDS } from '@kol/lexicon-runtime';
import { GameService } from '@kol/sim';
import {
  beatBoss,
  autoPlayTurn,
  createRandomizedStart,
  setupPartyFromOptions,
} from '@kol/test-support';
import { createGamePorts, type GamePorts, type TestBridge } from '../ports/GamePorts.js';
import { BootScene } from '../scenes/BootScene.js';
import { MainMenuScene } from '../scenes/MainMenuScene.js';
import { RunScene } from '../scenes/RunScene.js';

export interface BootResult {
  readonly game: Phaser.Game;
  readonly ports: GamePorts;
  readonly service: GameService;
}

export class BootOrchestrator {
  private game: Phaser.Game | null = null;
  private service: GameService | null = null;
  private ports: GamePorts | null = null;

  start(containerId: string): BootResult {
    const lexicon = createLexiconRuntime(DEFAULT_WORDS, DEFAULT_SEMANTIC_AFFINITIES);
    this.service = new GameService({ catalog: BUNDLED_CONTENT, lexicon });
    this.ports = createGamePorts(this.service);

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerId,
      width: 390,
      height: 844,
      backgroundColor: '#1a1a2e',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [BootScene, MainMenuScene, RunScene],
      physics: { default: 'arcade' },
    };

    this.game = new Phaser.Game(config);

    this.game.registry.set('gamePorts', this.ports);
    this.game.registry.set('gameService', this.service);

    this.exposeTestBridge();

    return { game: this.game, ports: this.ports, service: this.service };
  }

  private exposeTestBridge(): void {
    if (!this.service || !this.ports) return;

    const bridge: TestBridge = {
      getView: () => this.ports?.getView() ?? null,
      dispatch: (command) => {
        const outcome = this.ports?.dispatch(command);
        return { ok: outcome?.ok ?? false, revision: outcome?.revision ?? 0 };
      },
      startRandomizedRun: (seed: number) => {
        const options = createRandomizedStart(seed);
        setupPartyFromOptions(this.service!, options);
        return options;
      },
      autoPlayTurn: () => autoPlayTurn(this.service!),
      beatBoss: () => beatBoss(this.service!),
      getPhase: () => this.ports?.getView()?.phase ?? 'none',
    };

    window.__KOL_TEST__ = bridge;
  }

  destroy(): void {
    this.game?.destroy(true);
    this.game = null;
    this.service = null;
    this.ports = null;
    delete window.__KOL_TEST__;
  }
}

declare global {
  interface Window {
    __KOL_TEST__?: TestBridge;
  }
}

export type { TestBridge };
