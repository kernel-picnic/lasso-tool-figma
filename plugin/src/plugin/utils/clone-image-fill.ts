import { deepClone } from '@plugin/utils/deep-clone'

// TODO: handle 'TILE' images
// TODO: handle rotated layers
export const cloneImageFill = async (
  intersection: BooleanOperationNode,
  node: SceneNode,
  fill: ImagePaint,
): Promise<ImagePaint> => {
  const newFill = deepClone<ImagePaint>(fill)
  newFill.scaleMode = 'CROP'

  let size = null
  if (newFill.imageHash) {
    const image = figma.getImageByHash(newFill.imageHash)
    await image?.getBytesAsync() // Without this I'm getting 'Image dimensions not available' in getSizeAsync()
    size = await image?.getSizeAsync() // Real image size
  }
  const image = {
    width: size?.width || node.width,
    height: size?.height || node.height,
  }

  let resizeScale = 1
  switch (fill.scaleMode) {
    case 'FIT':
      resizeScale = Math.min(
        node.width / image.width,
        node.height / image.height,
      )
      break
    case 'FILL':
      resizeScale =
        Math.max(node.width, node.height) / Math.max(image.width, image.height)
      break
  }
  image.width *= resizeScale
  image.height *= resizeScale

  const scaleX = intersection.width / image.width
  const scaleY = intersection.height / image.height
  const nodeX = node.absoluteBoundingBox?.x || node.x
  const nodeY = node.absoluteBoundingBox?.y || node.y
  const offsetX = (image.width - node.width) / 2
  const offsetY = (image.height - node.height) / 2
  const translateX = (intersection.x - nodeX + offsetX) / image.width
  const translateY = (intersection.y - nodeY + offsetY) / image.height
  // TODO: check what is '0' in this matrix (rotation)
  newFill.imageTransform = [
    [scaleX, 0, translateX],
    [0, scaleY, translateY],
  ]
  return newFill
}
