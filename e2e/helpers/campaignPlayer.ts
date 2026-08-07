import type { Page } from '@playwright/test';
import { clickGame } from './canvas.js';
import { getDetailedGameState, type GameState } from './gameBridge.js';
import { advanceOneUiStep, hasProgressed, waitForProgress } from './uiPlayer.js';

const UI = {
  continueAct: { x: 195, y: 260 },
} as const;

const MAX_STUCK_STEPS = 30;
const MAX_CAMPAIGN_STEPS = 2_000;

async function playUntil(
  page: Page,
  stopWhen: (state: GameState) => boolean,
  maxSteps = MAX_CAMPAIGN_STEPS,
): Promise<GameState> {
  let state = await getDetailedGameState(page);
  let stuckCount = 0;

  for (let step = 0; step < maxSteps && !stopWhen(state); step++) {
    const before = state;
    const acted = await advanceOneUiStep(page, before);

    if (!acted) {
      stuckCount++;
      if (stuckCount >= MAX_STUCK_STEPS) {
        throw new Error(
          `Campaign UI stalled in phase "${state.phase}" battle="${state.battlePhase ?? 'none'}" after ${step} steps`,
        );
      }
      await page.waitForTimeout(250);
      state = await getDetailedGameState(page);
      continue;
    }

    state = await waitForProgress(page, before);
    if (!hasProgressed(before, state)) {
      stuckCount++;
      if (stuckCount >= MAX_STUCK_STEPS) {
        throw new Error(
          `Campaign UI made no progress in phase "${before.phase}" battle="${before.battlePhase ?? 'none'}" after ${step} steps`,
        );
      }
    } else {
      stuckCount = 0;
    }
  }

  if (!stopWhen(state)) {
    throw new Error(
      `Campaign UI did not reach target within ${maxSteps} steps (phase="${state.phase}" battle="${state.battlePhase ?? 'none'}")`,
    );
  }

  return state;
}

export async function playUntilActComplete(page: Page): Promise<GameState> {
  return playUntil(
    page,
    (next) => next.phase === 'ActComplete' || next.phase === 'RunVictory' || next.phase === 'RunDefeat',
  );
}

export async function completeAct(page: Page, actNumber: number): Promise<GameState> {
  let state = await getDetailedGameState(page);

  while (state.actIndex + 1 < actNumber && state.phase !== 'RunVictory' && state.phase !== 'RunDefeat') {
    if (state.phase === 'ActComplete') {
      await continueToNextAct(page, state.actIndex + 1);
      state = await getDetailedGameState(page);
      continue;
    }
    state = await playUntilActComplete(page);
  }

  return playUntil(
    page,
    (next) => next.phase === 'ActComplete' || next.phase === 'RunVictory' || next.phase === 'RunDefeat',
  );
}

async function continueToNextAct(page: Page, expectedActIndex: number): Promise<void> {
  await clickGame(page, UI.continueAct.x, UI.continueAct.y);
  await page.waitForFunction(
    (expectedAct) => {
      const view = window.__KOL_TEST__?.getView();
      return view?.phase === 'OverlandMap' && (view.actIndex ?? -1) >= expectedAct;
    },
    expectedActIndex,
    { timeout: 20_000 },
  );
}

export async function completeAllActs(page: Page, totalActs = 5): Promise<GameState> {
  let state = await getDetailedGameState(page);

  for (let act = 1; act <= totalActs; act++) {
    state = await playUntilActComplete(page);

    if (state.phase === 'RunVictory' || state.phase === 'RunDefeat') {
      return state;
    }

    if (act < totalActs) {
      await continueToNextAct(page, act);
      state = await getDetailedGameState(page);
    }
  }

  if (state.phase === 'ActComplete') {
    await clickGame(page, UI.continueAct.x, UI.continueAct.y);
    await page.waitForFunction(
      () => window.__KOL_TEST__?.getView()?.phase === 'RunVictory',
      null,
      { timeout: 20_000 },
    );
    state = await getDetailedGameState(page);
  }

  return state;
}
