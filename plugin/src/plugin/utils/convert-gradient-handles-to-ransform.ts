import { inv, multiply } from 'mathjs'

export const convertGradientHandlesToTransform = (
  identityMatrixHandlePositions: number[][],
  gradientHandlePositions: [
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
  ],
): Transform => {
  const gh = gradientHandlePositions
  const d = [
    [gh[0].x, gh[1].x, gh[2].x],
    [gh[0].y, gh[1].y, gh[2].y],
    [1, 1, 1],
  ]
  const m = multiply(identityMatrixHandlePositions, inv(d))
  return [m[0] as [number, number, number], m[1] as [number, number, number]]
}
