import type { Page } from '@playwright/test';
import { clickGame, GAME_WIDTH, traceHexPathPixels } from './canvas.js';
import { hexCoordToGamePixel } from './hexLayout.js';
import {
  findPlayableWord,
  getDetailedGameState,
  type DetailedGameState,
} from './gameBridge.js';
import { computeNodePosition } from './overlandLayout.js';

const CENTER_X = GAME_WIDTH / 2;
const SUBMIT_X = CENTER_X - 72;
const SUBMIT_Y = 678;
const REROLL_X = CENTER_X;
const REROLL_Y = 718;

const ACT1_TOWN_ROUTE = [
  'road-ambush',
  'eastroad-muster',
  'bramblewick',
  'blackroot-crossing',
  'broken-scriptorium',
  'zedwood-watchtower',
] as const;

function bfsDistance(
  map: NonNullable<DetailedGameState['overlandMap']>,
  fromNodeId: string,
  toNodeId: string,
): number {
  const queue: string[] = [fromNodeId];
  const visited = new Set<string>([fromNodeId]);
  let depth = 0;

  while (queue.length > 0) {
    const levelSize = queue.length;
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      if (node === toNodeId) return depth;
      for (const edge of map.edges) {
        if (edge.fromNodeId !== node || edge.closed) continue;
        if (!visited.has(edge.toNodeId)) {
          visited.add(edge.toNodeId);
          queue.push(edge.toNodeId);
        }
      }
    }
    depth++;
  }

  return 999;
}

function pickReachableNode(map: NonNullable<DetailedGameState['overlandMap']>): string | null {
  const reachable = [...map.reachableNodeIds];
  if (reachable.length === 0) return null;

  const preferred = ACT1_TOWN_ROUTE.find((nodeId) => reachable.includes(nodeId));
  if (preferred) return preferred;

  let best = reachable[0]!;
  let bestDist = bfsDistance(map, best, map.bossNodeId);
  for (const nodeId of reachable.slice(1)) {
    const dist = bfsDistance(map, nodeId, map.bossNodeId);
    if (dist < bestDist) {
      best = nodeId;
      bestDist = dist;
    }
  }
  return best;
}

async function waitForEnemyTurn(page: Page, revision: number): Promise<void> {
  await page.waitForFunction(
    (expectedRevision) => {
      const view = window.__KOL_TEST__?.getView();
      if (!view?.battle) return false;
      return view.revision !== expectedRevision || view.battle.phase !== 'EnemyTurnReady';
    },
    revision,
    { timeout: 5_000 },
  );
}

async function traceAndSubmitWord(page: Page): Promise<boolean> {
  const word = await findPlayableWord(page);
  if (!word) {
    await clickGame(page, REROLL_X, REROLL_Y);
    return true;
  }

  const pixels = word.path.map((coord) => hexCoordToGamePixel(coord));
  await traceHexPathPixels(page, pixels);
  await page.waitForTimeout(120);
  await clickGame(page, SUBMIT_X, SUBMIT_Y);
  return true;
}

async function clickOverlandNode(page: Page, state: DetailedGameState): Promise<boolean> {
  if (!state.overlandMap) return false;

  const nodeId = pickReachableNode(state.overlandMap);
  if (!nodeId) return false;

  const position = computeNodePosition(
    { nodes: state.overlandMap.nodes },
    nodeId,
  );
  if (!position) return false;

  await clickGame(page, position.x, position.y);
  return true;
}

export async function advanceOneUiStep(page: Page, state: DetailedGameState): Promise<boolean> {
  switch (state.phase) {
    case 'OverlandMap':
      return clickOverlandNode(page, state);

    case 'DestinationEntry':
      if (state.pendingRecruitCount > 0) {
        await clickGame(page, CENTER_X, 220);
        return true;
      }
      await clickGame(page, CENTER_X, 240);
      return true;

    case 'TownServices':
      await clickGame(page, CENTER_X, 180 + state.shopArmoryCount * 48 + 72);
      return true;

    case 'DestinationResolution':
    case 'BossReward':
      if (state.pendingRewardCount > 0) {
        await clickGame(page, CENTER_X, 180);
        return true;
      }
      if (state.pendingEventCount > 0) {
        await clickGame(page, CENTER_X, 180 + state.pendingRewardCount * 52);
        return true;
      }
      await clickGame(
        page,
        CENTER_X,
        240 + state.pendingRewardCount * 52 + state.pendingEventCount * 52,
      );
      return true;

    case 'Encounter':
      if (!state.hasBattle) {
        await clickGame(page, CENTER_X, 400);
        return true;
      }
      if (state.battlePhase === 'HeroTurnAwaitingWord') {
        return traceAndSubmitWord(page);
      }
      if (state.battlePhase === 'EnemyTurnReady') {
        await waitForEnemyTurn(page, state.revision);
        return true;
      }
      return false;

    case 'DefeatRecovery':
      await clickGame(page, CENTER_X, 180 + state.downedHeroCount * 52 + 24);
      return true;

    case 'Formation':
      await clickGame(page, CENTER_X, 360);
      await page.waitForTimeout(200);
      await clickGame(page, CENTER_X, 420);
      return true;

    default:
      return false;
  }
}

export async function waitForProgress(
  page: Page,
  before: DetailedGameState,
  timeoutMs = 15_000,
): Promise<DetailedGameState> {
  const deadline = Date.now() + timeoutMs;
  let current = before;

  while (Date.now() < deadline) {
    await page.waitForTimeout(100);
    current = await getDetailedGameState(page);
    if (
      current.revision !== before.revision
      || current.phase !== before.phase
      || current.battlePhase !== before.battlePhase
    ) {
      return current;
    }
  }

  return current;
}

export function hasProgressed(before: DetailedGameState, after: DetailedGameState): boolean {
  return (
    after.revision !== before.revision
    || after.phase !== before.phase
    || after.battlePhase !== before.battlePhase
  );
}
