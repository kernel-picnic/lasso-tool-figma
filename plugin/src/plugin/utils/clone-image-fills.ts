export const cloneImageFills = (
  intersection: BooleanOperationNode,
  node: RectangleNode,
): ImagePaint[] => {
  if (!Array.isArray(node.fills)) {
    return []
  }

  const cloneFill = (fill: ImagePaint) => {
    const newFill = JSON.parse(JSON.stringify(fill))
    newFill.scaleMode = 'CROP'
    const scaleX = intersection.width / node.width
    const scaleY = intersection.height / node.height
    const translateX = (intersection.x - node.x) / node.width
    const translateY = (intersection.y - node.y) / node.height
    newFill.imageTransform = [
      [scaleX, 0, translateX],
      [0, scaleY, translateY],
    ]
    return newFill
  }

  return node.fills.map((fill: ImagePaint) => {
    if (fill.type === 'IMAGE') {
      return cloneFill(fill)
    }
    return fill
  })
}
