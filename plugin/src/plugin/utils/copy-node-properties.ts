export const copyNodeProperties = (
  target: SceneNode,
  node: SceneNode,
  copyStrokes = true,
) => {
  try {
    const properties = [
      'name',
      'visible',
      'effects',
      'strokeWeight',
      'strokeAlign',
      'fills',
      'opacity',
      'topLeftRadius',
      'topRightRadius',
      'bottomLeftRadius',
      'bottomRightRadius',
    ]
    if (copyStrokes) {
      properties.unshift('strokes')
    }
    properties.forEach((property) => {
      if (property in node && property in target) {
        // TODO: add types
        // @ts-ignore
        target[property] = node[property]
      }
    })
  } catch (e) {
    // TODO: fix "Cannot unwrap symbol"
    console.warn('Error copy node properties: ', node.name, e)
  }
}
