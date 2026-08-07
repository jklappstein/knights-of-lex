interface MapNode {
  readonly nodeId: string;
  readonly layer: number;
}

interface OverlandMapState {
  readonly nodes: readonly MapNode[];
}

export function computeNodePosition(
  map: OverlandMapState,
  nodeId: string,
  areaX = 28,
  areaY = 188,
  areaWidth = 334,
  areaHeight = 470,
): { x: number; y: number } | null {
  const layers = new Map<number, MapNode[]>();
  for (const node of map.nodes) {
    const list = layers.get(node.layer) ?? [];
    layers.set(node.layer, [...list, node]);
  }

  const layerIndices = [...layers.keys()].sort((a, b) => a - b);
  const maxLayer = layerIndices[layerIndices.length - 1] ?? 0;
  const layerStep = maxLayer > 0 ? (areaHeight - 56) / maxLayer : 0;

  for (const layer of layerIndices) {
    const nodesInLayer = [...(layers.get(layer) ?? [])].sort((a, b) =>
      a.nodeId.localeCompare(b.nodeId),
    );
    const count = nodesInLayer.length;
    for (let index = 0; index < nodesInLayer.length; index++) {
      const node = nodesInLayer[index]!;
      if (node.nodeId !== nodeId) continue;
      const slot = index + 1;
      const x = areaX + (areaWidth / (count + 1)) * slot;
      const y = areaY + areaHeight - 28 - layer * layerStep;
      return { x, y };
    }
  }

  return null;
}
