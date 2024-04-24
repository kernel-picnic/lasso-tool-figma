export const isIntersected = (outer: Rect, inner: Rect): boolean => {
  const innerTop = inner.y
  const innerRight = inner.x + inner.width
  const innerBottom = inner.y + inner.height
  const innerLeft = inner.x

  const outerTop = outer.y
  const outerRight = outer.x + outer.width
  const outerBottom = outer.y + outer.height
  const outerLeft = outer.x

  return !(
    innerRight < outerLeft ||
    innerLeft > outerRight ||
    innerBottom < outerTop ||
    innerTop > outerBottom
  )
}
