export const getMousePosition = (): Vector | null => {
  const { position } = figma.activeUsers[0]
  return position
  // TODO: add 'precision' option
  // const x = Math.round(position.x)
  // const y = Math.round(position.y)
  // return { x, y }
}
