import { areNodesIntersecting } from '@plugin/utils/are-nodes-intersecting.ts'

export const getIntersections = (selectedNode: SceneNode): SceneNode[] => {
  return figma.currentPage.findAll().filter((node) => {
    if (!areNodesIntersecting(node, selectedNode)) {
      return
    }
    return true
  })
}
