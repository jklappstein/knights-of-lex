import type { Page } from '@playwright/test';

export interface GameState {
  readonly phase: string;
  readonly actIndex: number;
  readonly partySize: number;
  readonly revision: number;
  readonly battlePhase: string | null;
}

export interface OverlandMapSnapshot {
  readonly currentNodeId: string;
  readonly reachableNodeIds: readonly string[];
  readonly bossNodeId: string;
  readonly nodes: readonly { nodeId: string; layer: number }[];
  readonly edges: readonly { fromNodeId: string; toNodeId: string; closed: boolean }[];
}

export interface DetailedGameState extends GameState {
  readonly hasBattle: boolean;
  readonly overlandMap: OverlandMapSnapshot | null;
  readonly pendingRecruitCount: number;
  readonly pendingRewardCount: number;
  readonly pendingEventCount: number;
  readonly shopArmoryCount: number;
  readonly downedHeroCount: number;
}

export interface PlayableWord {
  readonly heroId: string;
  readonly path: readonly { q: number; r: number }[];
  readonly boardRevision: number;
}

export async function waitForGameBridge(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__KOL_TEST__ !== undefined, null, { timeout: 30_000 });
}

export async function getGameState(page: Page): Promise<GameState> {
  const detailed = await getDetailedGameState(page);
  return {
    phase: detailed.phase,
    actIndex: detailed.actIndex,
    partySize: detailed.partySize,
    revision: detailed.revision,
    battlePhase: detailed.battlePhase,
  };
}

export async function getDetailedGameState(page: Page): Promise<DetailedGameState> {
  return page.evaluate(() => {
    const bridge = window.__KOL_TEST__;
    const view = bridge?.getView();
    if (!view) {
      return {
        phase: bridge?.getPhase() ?? 'unknown',
        actIndex: -1,
        partySize: 0,
        revision: 0,
        battlePhase: null,
        hasBattle: false,
        overlandMap: null,
        pendingRecruitCount: 0,
        pendingRewardCount: 0,
        pendingEventCount: 0,
        shopArmoryCount: 0,
        downedHeroCount: 0,
      };
    }

    const map = view.overlandMap;
    const reachable = map
      ? map.edges
        .filter(
          (edge) =>
            edge.fromNodeId === map.currentNodeId
            && !edge.closed
            && !map.closedNodeIds.includes(edge.toNodeId),
        )
        .map((edge) => edge.toNodeId as string)
      : [];

    return {
      phase: view.phase,
      actIndex: view.actIndex,
      partySize: view.party.length,
      revision: view.revision,
      battlePhase: view.battle?.phase ?? null,
      hasBattle: Boolean(view.battle),
      overlandMap: map
        ? {
            currentNodeId: map.currentNodeId as string,
            reachableNodeIds: reachable,
            bossNodeId: map.bossNodeId as string,
            nodes: map.nodes.map((node) => ({
              nodeId: node.nodeId as string,
              layer: node.layer,
            })),
            edges: map.edges.map((edge) => ({
              fromNodeId: edge.fromNodeId as string,
              toNodeId: edge.toNodeId as string,
              closed: edge.closed,
            })),
          }
        : null,
      pendingRecruitCount: view.pendingRecruitOffers.length,
      pendingRewardCount: view.pendingRewardChoices?.length ?? 0,
      pendingEventCount: view.pendingEventOptions?.length ?? 0,
      shopArmoryCount: view.shopStock?.armory?.length ?? 0,
      downedHeroCount: view.party.filter((hero) => hero.isDowned || hero.currentHp <= 0).length,
    };
  });
}

export async function findPlayableWord(page: Page): Promise<PlayableWord | null> {
  return page.evaluate(() => window.__KOL_TEST__?.findPlayableWord() ?? null);
}

declare global {
  interface Window {
    __KOL_TEST__?: {
      startRandomizedRun(seed: number): unknown;
      getView(): {
        phase: string;
        actIndex: number;
        revision: number;
        party: { isDowned: boolean; currentHp: number }[];
        battle?: { phase: string } | null;
        overlandMap?: {
          currentNodeId: string;
          bossNodeId: string;
          nodes: { nodeId: string; layer: number }[];
          edges: { fromNodeId: string; toNodeId: string; closed: boolean }[];
          closedNodeIds: string[];
        } | null;
        pendingRecruitOffers: string[];
        pendingRewardChoices?: { choiceId: string; label: string }[];
        pendingEventOptions?: { optionId: string; label: string }[];
        shopStock?: { armory?: string[] };
      } | null;
      getPhase(): string;
      findPlayableWord(): PlayableWord | null;
    };
  }
}
