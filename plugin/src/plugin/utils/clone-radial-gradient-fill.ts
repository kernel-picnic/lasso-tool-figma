import { inv } from 'mathjs'
import { deepClone } from '@plugin/utils/deep-clone'
import { applyMatrixToPoint } from '@plugin/utils/apply-matrix-to-point'
import { convertGradientHandlesToTransform } from '@plugin/utils/convert-gradient-handles-to-ransform'

const identityMatrixHandlePositions = [
  [0.5, 1, 0.5],
  [0.5, 0.5, 1],
  [1, 1, 1],
]

// https://github.com/figma-plugin-helper-functions/figma-plugin-helpers/blob/5f3a767/src/helpers/extractRadialOrDiamondGradientParams.ts
export function extractRadialOrDiamondGradientParams(
  shapeWidth: number,
  shapeHeight: number,
  t: number[][],
) {
  const transform = t.length === 2 ? [...t, [0, 0, 1]] : [...t]
  const mxInv = inv(transform)
  const startEnd = [
    [0.5, 0.5],
    [1, 0.5],
    [0.5, 1],
  ].map((p) => applyMatrixToPoint(mxInv, p))
  return {
    start: [startEnd[0][0] * shapeWidth, startEnd[0][1] * shapeHeight],
    end: [startEnd[1][0] * shapeWidth, startEnd[1][1] * shapeHeight],
    rotation: [startEnd[2][0] * shapeWidth, startEnd[2][1] * shapeHeight],
  }
}

export const cloneRadialGradientFill = (
  intersection: BooleanOperationNode,
  node: SceneNode,
  fill: GradientPaint,
): GradientPaint => {
  const newFill = deepClone<GradientPaint>(fill)
  const extract = extractRadialOrDiamondGradientParams(
    node.width,
    node.height,
    newFill.gradientTransform,
  )
  const topOffset = intersection.y - node.y
  const leftOffset = intersection.x - node.x
  const x1 = (extract.start[0] - leftOffset) / intersection.width
  const y1 = (extract.start[1] - topOffset) / intersection.height
  const x2 = (extract.end[0] - leftOffset) / intersection.width
  const y2 = (extract.end[1] - topOffset) / intersection.height
  const x3 = (extract.rotation[0] - leftOffset) / intersection.width
  const y3 = (extract.rotation[1] - topOffset) / intersection.height
  newFill.gradientTransform = convertGradientHandlesToTransform(
    identityMatrixHandlePositions,
    [
      {
        x: x1,
        y: y1,
      },
      {
        x: x2,
        y: y2,
      },
      {
        x: x3,
        y: y3,
      },
    ],
  )
  return newFill
}
