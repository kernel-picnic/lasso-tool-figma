import {
  CONTAINER_NODE,
  CONTAINER_NODE_TYPES,
} from '@common/types/container-node'
import { copyNodeProperties } from '@plugin/utils/copy-node-properties'
import { copyNode } from '@plugin/actions/copy-node'
import { copyLasso } from '@/plugin'

export const cutNode = (node: SceneNode) => {
  if (!node.parent) {
    return []
  }
  // Working with auto-layout is too complex,
  // so just disable it; anyway 'CUT' mode
  // breaks too much to care about it
  if ('layoutMode' in node && node.layoutMode !== 'NONE') {
    node.layoutMode = 'NONE'
  }
  let target = node
  // Because we can't cut something from
  // frames, sections and other similar nodes
  const isVirtualNode = CONTAINER_NODE_TYPES.includes(node.type)
  if (isVirtualNode) {
    node = node as CONTAINER_NODE
    target = figma.createRectangle()
    target.resize(node.width, node.height)
    node.appendChild(target)
    copyNodeProperties(target, node)
    // Clear origin styles to prevent styles layering
    if ('fills' in node) node.fills = []
    if ('strokes' in node) node.strokes = []
  }
  const parent = node.parent || figma.currentPage
  const index = isVirtualNode ? 0 : parent.children.indexOf(node)
  const subtract = figma.subtract(
    [copyLasso(), target],
    isVirtualNode ? (node as CONTAINER_NODE) : parent,
    index,
  )
  copyNodeProperties(subtract, target)
  // TODO: add option to enable/disable flatten for 'CUT' mode
  // const flat = figma.flatten([subtract], parent, index)
  return [copyNode(target), subtract]
}
