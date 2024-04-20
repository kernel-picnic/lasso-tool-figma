export const distanceToNodeSide = (
  mousePosition: Vector,
  nodeBounds: Rect,
): Vector => {
  const dx = Math.max(
    nodeBounds.x - mousePosition.x,
    0,
    mousePosition.x - (nodeBounds.x + nodeBounds.width),
  )
  const dy = Math.max(
    nodeBounds.y - mousePosition.y,
    0,
    mousePosition.y - (nodeBounds.y + nodeBounds.height),
  )
  return { x: dx, y: dy }
}
