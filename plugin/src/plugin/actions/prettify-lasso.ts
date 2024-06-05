const FACTOR = 10

export function prettifyLasso(
  vertices: VectorVertex[],
  segments: VectorSegment[],
) {
  // Function to calculate tangents
  const tangents = vertices.map(() => ({
    tangentStart: { x: 0, y: 0 },
    tangentEnd: { x: 0, y: 0 },
  }))

  segments.forEach((segment) => {
    const start = vertices[segment.start]
    const end = vertices[segment.end]

    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.sqrt(dx * dx + dy * dy) || 1
    const tangent = { x: dx / length, y: dy / length }

    console.log(dx, dy, length, tangent)
    tangents[segment.start].tangentEnd = tangent
    tangents[segment.end].tangentStart = tangent
  })

  segments = segments.map((segment, i) => ({
    ...segment,
    tangentStart: {
      x: tangents[i].tangentStart.x * FACTOR,
      y: tangents[i].tangentStart.y * FACTOR,
    },
    // TODO
    tangentEnd: {
      x: -tangents[i].tangentEnd.x * FACTOR,
      y: -tangents[i].tangentEnd.y * FACTOR,
    },
  }))

  console.log(vertices, segments)

  return segments
}
