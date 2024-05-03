import { distanceToNodeSide } from '@plugin/utils/distance-to-node-side'
import { nearestPositionToNode } from '@plugin/utils/nearest-position-to-node'

const MAGNETIC_BASE_DISTANCE = 30

export const getMagneticPosition = (
  mousePosition: Vector,
  lassoId: string,
): Vector | undefined => {
  const nodes = figma.currentPage.findAll()
  const magneticDistance = MAGNETIC_BASE_DISTANCE / figma.viewport.zoom
  for (let node of nodes) {
    if (node.id === lassoId) {
      continue
    }
    if (!node.absoluteBoundingBox) {
      continue
    }
    const distance = distanceToNodeSide(mousePosition, node.absoluteBoundingBox)
    if (distance.x > magneticDistance || distance.y > magneticDistance) {
      continue
    }
    const nearestPosition = nearestPositionToNode(
      mousePosition,
      node.absoluteBoundingBox,
    )
    if (
      // If user already over node, node side can be far
      Math.abs(nearestPosition.x - mousePosition.x) > magneticDistance ||
      Math.abs(nearestPosition.y - mousePosition.y) > magneticDistance
    ) {
      continue
    }
    // TODO: fix wrong position in unknown cases
    return nearestPosition
  }
}
