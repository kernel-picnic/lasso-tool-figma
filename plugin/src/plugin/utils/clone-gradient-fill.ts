import { multiply, inv } from 'mathjs'
import { deepClone } from '@plugin/utils/deep-clone'

function applyMatrixToPoint(matrix: number[][], point: number[]) {
  return [
    point[0] * matrix[0][0] + point[1] * matrix[0][1] + matrix[0][2],
    point[0] * matrix[1][0] + point[1] * matrix[1][1] + matrix[1][2],
  ]
}

function extractLinearGradientParamsFromTransform(
  shapeWidth: number,
  shapeHeight: number,
  t: Transform,
) {
  const transform = t.length === 2 ? [...t, [0, 0, 1]] : [...t]
  const mxInv = inv(transform)
  const startEnd = [
    [0, 0.5],
    [1, 0.5],
  ].map((p) => applyMatrixToPoint(mxInv, p))
  return {
    start: [startEnd[0][0] * shapeWidth, startEnd[0][1] * shapeHeight],
    end: [startEnd[1][0] * shapeWidth, startEnd[1][1] * shapeHeight],
  }
}

// TODO: add types
function getProjectedLength(rectWidth, rectHeight, radians) {
  return (
    Math.abs(rectWidth * Math.cos(radians)) +
    Math.abs(rectHeight * Math.sin(radians))
  )
}

export const cloneGradientFill = (
  intersection: BooleanOperationNode,
  node: Rect,
  fill: GradientPaint,
): GradientPaint => {
  const newFill = deepClone<GradientPaint>(fill)
  const nodeGradientParams = extractLinearGradientParamsFromTransform(
    node.width,
    node.height,
    newFill.gradientTransform,
  )
  const intersectionGradientParams = extractLinearGradientParamsFromTransform(
    intersection.width,
    intersection.height,
    newFill.gradientTransform,
  )
  console.log('exact', nodeGradientParams, intersectionGradientParams)
  const rad = 0
  // const rad = Math.atan2(
  //   newFill.gradientTransform[1][0],
  //   newFill.gradientTransform[0][0],
  // )
  const nodeGradientLength = getProjectedLength(node.width, node.height, rad)
  const intersectionGradientLength = getProjectedLength(
    intersection.width,
    intersection.height,
    rad,
  )
  const scale = intersectionGradientLength / nodeGradientLength
  console.log('scale', scale)
  const offsetX =
    intersectionGradientParams.start[0] / (nodeGradientParams.start[0] || 1)
  const offsetY =
    Math.max(nodeGradientParams.start[1], intersectionGradientParams.start[1]) /
      (Math.min(
        nodeGradientParams.start[1],
        intersectionGradientParams.start[1],
      ) || 1) -
    1
  console.log('offset', offsetX, offsetY)
  const result = multiply(
    [...newFill.gradientTransform, [0, 0, 1]],
    [
      [scale, 0, 0],
      [0, scale, 0],
      [0, 0, 1],
    ],
    [
      [1, 0, offsetX],
      [0, 1, offsetY],
      [0, 0, 1],
    ],
  )
  newFill.gradientTransform = [result[0], result[1]]
  return newFill
}
