import { deepClone } from '@plugin/utils/deep-clone'

export const cloneImageFill = (
  intersection: BooleanOperationNode,
  node: Rect,
  fill: ImagePaint,
): ImagePaint => {
  const newFill = deepClone<ImagePaint>(fill)
  newFill.scaleMode = 'CROP'
  const scaleX = intersection.width / node.width
  const scaleY = intersection.height / node.height
  const translateX = (intersection.x - node.x) / node.width
  const translateY = (intersection.y - node.y) / node.height
  // TODO: check 0 in matrix
  newFill.imageTransform = [
    [scaleX, 0, translateX],
    [0, scaleY, translateY],
  ]
  return newFill
}
