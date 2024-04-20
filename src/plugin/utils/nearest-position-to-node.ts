export const nearestPositionToNode = (mousePosition: Vector, rect: Rect) => {
  const mouseX = mousePosition.x
  const mouseY = mousePosition.y

  const nodeX = rect.x
  const nodeY = rect.y
  const nodeWidth = rect.width
  const nodeHeight = rect.height

  // Calculate the distances from the mouse position to the edges of the node
  const distanceLeft = Math.abs(mouseX - nodeX)
  const distanceRight = Math.abs(mouseX - (nodeX + nodeWidth))
  const distanceTop = Math.abs(mouseY - nodeY)
  const distanceBottom = Math.abs(mouseY - (nodeY + nodeHeight))

  // Find the minimum distance
  const minDistance = Math.min(
    distanceLeft,
    distanceRight,
    distanceTop,
    distanceBottom,
  )

  // Determine the nearest position based on the minimum distance
  let nearestX, nearestY
  if (minDistance === distanceLeft) {
    nearestX = nodeX
    nearestY = mouseY
  } else if (minDistance === distanceRight) {
    nearestX = nodeX + nodeWidth
    nearestY = mouseY
  } else if (minDistance === distanceTop) {
    nearestX = mouseX
    nearestY = nodeY
  } else {
    nearestX = mouseX
    nearestY = nodeY + nodeHeight
  }

  return { x: nearestX, y: nearestY }
}
