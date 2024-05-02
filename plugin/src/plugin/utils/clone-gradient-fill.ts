import { multiply, inv } from 'mathjs'
import { deepClone } from '@plugin/utils/deep-clone'

const identityMatrixHandlePositions = [
  [0, 1, 0],
  [0.5, 0.5, 1],
  [1, 1, 1],
]

function convertGradientHandlesToTransform(
  gradientHandlePositions: [
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
  ],
): Transform {
  const gh = gradientHandlePositions
  const d = [
    [gh[0].x, gh[1].x, gh[2].x],
    [gh[0].y, gh[1].y, gh[2].y],
    [1, 1, 1],
  ]
  const o = identityMatrixHandlePositions
  const m = multiply(o, inv(d))

  return [m[0] as [number, number, number], m[1] as [number, number, number]]
}

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
    [0, 1],
  ].map((p) => applyMatrixToPoint(mxInv, p))
  return {
    start: [startEnd[0][0] * shapeWidth, startEnd[0][1] * shapeHeight],
    end: [startEnd[1][0] * shapeWidth, startEnd[1][1] * shapeHeight],
    rotation: [startEnd[2][0] * shapeWidth, startEnd[2][1] * shapeHeight],
  }
}

export const cloneGradientFill = (
  intersection: BooleanOperationNode,
  node: SceneNode,
  fill: GradientPaint,
): GradientPaint => {
  const newFill = deepClone<GradientPaint>(fill)
  const extract = extractLinearGradientParamsFromTransform(
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
  newFill.gradientTransform = convertGradientHandlesToTransform([
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
  ])
  return newFill
}
