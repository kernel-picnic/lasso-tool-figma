export const copyNodeProperties = (target: SceneNode, node: SceneNode) => {
  try {
    const properties = [
      'name',
      'visible',
      'strokes',
      'effects',
      'strokeWeight',
      'strokeAlign',
      'fills',
      'topLeftRadius',
      'topRightRadius',
      'bottomLeftRadius',
      'bottomRightRadius',
    ]
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
