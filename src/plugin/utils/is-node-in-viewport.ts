export const isNodeInViewport = (node: SceneNode) => {
  const nodeBounds = node.absoluteBoundingBox

  if (!nodeBounds) {
    return false
  }
  return (
    nodeBounds.x + nodeBounds.width >= figma.viewport.bounds.x &&
    nodeBounds.x <= figma.viewport.bounds.x + figma.viewport.bounds.width &&
    nodeBounds.y + nodeBounds.height >= figma.viewport.bounds.y &&
    nodeBounds.y <= figma.viewport.bounds.y + figma.viewport.bounds.height
  )
}
