import { areNodesIntersecting } from '@plugin/utils/are-nodes-intersecting.ts'

export const traverseAndGetIntersections = (
  nodes: SceneNode[],
  selectedNode: SceneNode,
): SceneNode[] => {
  return nodes.filter((node) => {
    if (!areNodesIntersecting(node, selectedNode)) {
      return
    }
    if (node.type === 'GROUP') {
      return
    }
    return true
  })
}
