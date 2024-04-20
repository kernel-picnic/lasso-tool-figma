export const getMousePosition = (): any => {
  const { position }: { position: any } = figma.activeUsers[0]
  if (!position) {
    return
  }
  return position
  // TODO: add 'precision' option
  // const x = Math.round(position.x)
  // const y = Math.round(position.y)
  // return { x, y }
}
