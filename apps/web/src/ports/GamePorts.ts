import type { RunView, GameCommand, GameFact } from '@kol/shared-types';
import type { GameService } from '@kol/sim';
import type { RandomizedStartOptions } from '@kol/test-support';

export interface GamePorts {
  readonly getView: () => RunView | null;
  readonly dispatch: (command: GameCommand) => { ok: boolean; revision: number; facts: readonly GameFact[] };
  readonly getFacts: () => readonly GameFact[];
}

export interface TestBridge {
  readonly getView: () => RunView | null;
  readonly dispatch: (command: GameCommand) => { ok: boolean; revision: number };
  readonly startRandomizedRun: (seed: number) => RandomizedStartOptions;
  readonly autoPlayTurn: () => boolean;
  readonly beatBoss: () => RunView | null;
  readonly getPhase: () => string;
}

export function createGamePorts(service: GameService): GamePorts {
  return {
    getView: () => service.getView(),
    dispatch: (command) => {
      const outcome = service.dispatch(command);
      return {
        ok: outcome.result.ok,
        revision: outcome.result.ok ? outcome.result.revision : 0,
        facts: outcome.facts,
      };
    },
    getFacts: () => service.getFacts(),
  };
}
