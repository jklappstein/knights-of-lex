import type { RunView, GameCommand, GameFact } from '@kol/shared-types';
import type { GameService } from '@kol/sim';
import type { RandomizedStartOptions } from '@kol/test-support';

export interface GamePorts {
  readonly getView: () => RunView | null;
  readonly dispatch: (command: GameCommand) => {
    ok: boolean;
    revision: number;
    code?: string;
    message?: string;
    facts: readonly GameFact[];
  };
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
      if (outcome.result.ok) {
        return {
          ok: true,
          revision: outcome.result.revision,
          facts: outcome.facts,
        };
      }
      return {
        ok: false,
        revision: 0,
        code: outcome.result.code,
        message: outcome.result.message,
        facts: outcome.facts,
      };
    },
    getFacts: () => service.getFacts(),
  };
}
