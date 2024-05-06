// Thx to https://github.com/cotlra/figma-detach-selected-instances/blob/main/src/detach-all-instances.ts
export const detachAllInstances = (nodes: ReadonlyArray<SceneNode>) => {
  try {
    for (let i = 0; i < nodes.length; i++) {
      const node: SceneNode = nodes[i]
      if (node.type === 'INSTANCE') {
        let frame: FrameNode = node.detachInstance()
        detachAllInstances(frame.children)
      } else if ('children' in node) {
        detachAllInstances(node.children)
      }
    }
  } catch (e) {
    console.warn('Error trying to detach node - skip it')
  }
}
