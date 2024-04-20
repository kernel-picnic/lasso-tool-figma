import { notEmpty } from './not-empty'

export const hasBoundingBox = (
  node: SceneNode,
): node is SceneNode & { absoluteBoundingBox: Rect } =>
  'absoluteBoundingBox' in node && notEmpty(node.absoluteBoundingBox)
