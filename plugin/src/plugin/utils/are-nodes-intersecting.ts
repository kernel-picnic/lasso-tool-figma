import { hasBoundingBox } from './has-bounding-box'
import { isIntersected } from './is-intersected.ts'

export const areNodesIntersecting = (
  node: SceneNode,
  selectedNode: SceneNode,
): boolean => {
  if (!hasBoundingBox(selectedNode)) {
    return false
  }

  return (
    hasBoundingBox(node) &&
    isIntersected(node.absoluteBoundingBox, selectedNode.absoluteBoundingBox) &&
    'visible' in node &&
    node.visible
  )
}
