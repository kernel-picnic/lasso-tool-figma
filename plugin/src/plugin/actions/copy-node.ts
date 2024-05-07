import { cloneImageFill } from '@plugin/utils/clone-image-fill'
import { cloneLinearGradientFill } from '@plugin/utils/clone-linear-gradient-fill'
import { cloneRadialGradientFill } from '@plugin/utils/clone-radial-gradient-fill'
import { copyNodeProperties } from '@plugin/utils/copy-node-properties'
import { CONTAINER_NODE_TYPES } from '@common/types/container-node'

function applyParentsCornerRadius(clone: SceneNode, node: SceneNode) {
  let traverse: any = node
  // TODO: write general traverse function
  while (traverse?.parent) {
    traverse = traverse.parent
    if (!('clipsContent' in traverse)) {
      continue
    }
    if (!traverse.clipsContent) {
      continue
    }
    const rect = figma.createRectangle()
    rect.resize(traverse.width, traverse.height)
    rect.relativeTransform = traverse.absoluteTransform
    copyNodeProperties(rect, traverse)
    clone = figma.flatten(
      [figma.intersect([rect, clone], figma.currentPage)],
      figma.currentPage,
    )
  }
  copyNodeProperties(clone, node)
  return clone
}

export const copyNode = (node: SceneNode, lassoCopy: VectorNode) => {
  let clone: SceneNode
  if (CONTAINER_NODE_TYPES.includes(node.type)) {
    clone = figma.createRectangle()
    copyNodeProperties(clone, node)
    clone.resize(node.width, node.height)
  } else {
    clone = node.clone()
  }

  clone.relativeTransform = node.absoluteTransform // Copy position
  clone = applyParentsCornerRadius(clone, node)
  const intersection = figma.intersect([lassoCopy, clone], figma.currentPage)

  if ('fills' in clone && Array.isArray(clone.fills)) {
    clone.fills = clone.fills.map((fill) => {
      switch (fill.type) {
        case 'IMAGE':
          return cloneImageFill(intersection, clone, fill)
        case 'GRADIENT_LINEAR':
          return cloneLinearGradientFill(intersection, clone, fill)
        case 'GRADIENT_RADIAL':
        case 'GRADIENT_ANGULAR':
        case 'GRADIENT_DIAMOND':
          return cloneRadialGradientFill(intersection, clone, fill)
        default:
          return fill
      }
    })
  }

  copyNodeProperties(intersection, clone)
  return figma.flatten([intersection], figma.currentPage)
}
