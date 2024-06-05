// Function to simplify a vector using Ramer-Douglas-Peucker algorithm

export const simplifyVector = (
  points: VectorVertex[],
  epsilon: number = 10,
) => {
  // Find the point with the maximum distance
  let dmax = 0
  let index = 0
  const end = points.length - 1
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end])
    if (d > dmax) {
      index = i
      dmax = d
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (dmax > epsilon) {
    const firstPart: any = simplifyVector(points.slice(0, index + 1), epsilon)
    const secondPart: any = simplifyVector(points.slice(index), epsilon)
    return firstPart.slice(0, -1).concat(secondPart)
  } else {
    return [points[0], points[end]]
  }
}

// Function to calculate perpendicular distance of a point from a line
function perpendicularDistance(point: any, lineStart: any, lineEnd: any) {
  const { x: x1, y: y1 } = lineStart
  const { x: x2, y: y2 } = lineEnd
  const { x: x, y: y } = point

  const A = x - x1
  const B = y - y1
  const C = x2 - x1
  const D = y2 - y1

  const dot = A * C + B * D
  const len_sq = C * C + D * D
  const param = dot / len_sq

  let xx, yy

  if (param < 0 || (x1 === x2 && y1 === y2)) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }

  const dx = x - xx
  const dy = y - yy

  return Math.sqrt(dx * dx + dy * dy)
}
