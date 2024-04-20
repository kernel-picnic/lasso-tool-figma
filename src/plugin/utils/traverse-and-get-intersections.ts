import { areNodesIntersecting } from '@plugin/utils/are-nodes-intersecting.ts'

export const traverseAndGetIntersections = (
  nodes: SceneNode[],
  selectedNode: SceneNode,
  accumulator: SceneNode[] = [],
): SceneNode[] => {
  nodes.forEach((node) => {
    if (areNodesIntersecting(node, selectedNode)) {
      if (node.type !== 'GROUP') {
        accumulator.push(node)
      }

      if ('children' in node && node.children.length > 0) {
        traverseAndGetIntersections(
          Array.from(node.children),
          selectedNode,
          accumulator,
        )
      }
    }
  })

  return accumulator
}
