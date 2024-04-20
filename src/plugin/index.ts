import { actions } from '@common/actions'
import { areNodesIntersecting } from '@plugin/utils/are-nodes-intersecting'
import { getMousePosition } from '@plugin/utils/get-mouse-position'
import { isNodeInViewport } from '@plugin/utils/is-node-in-viewport'

const FILL_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAFCAYAAAB8ZH1oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAhSURBVHgBjcxBDQAACIBAdPavjBXgzW4ACS2x0wR2MY8PN64ECEABN0sAAAAASUVORK5CYII='

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { themeColors: true })

let interval: any
let selection: VectorNode
const vertices: any[] = []
const segments: any[] = []
// TODO: add type
let savedPosition: any = {}

const changeVector = (position: any) => {
  return selection
    .setVectorNetworkAsync({
      vertices,
      segments,
    })
    .then(() => {
      if (position.x < savedPosition.x) {
        savedPosition.x = position.x
      }
      if (position.y < savedPosition.y) {
        savedPosition.y = position.y
      }
      selection.x = savedPosition.x
      selection.y = savedPosition.y
    })
}

const traverseAndGetIntersections = (
  nodes: SceneNode[],
  selectedNode: SceneNode,
  accumulator: SceneNode[] = [],
): SceneNode[] => {
  nodes.forEach((node) => {
    if (areNodesIntersecting(node, selectedNode)) {
      if (node.type !== 'GROUP') {
        accumulator.push(node)
      }

      if ('children' in node && node.children.length > 0) {
        traverseAndGetIntersections(
          Array.from(node.children),
          selectedNode,
          accumulator,
        )
      }
    }
  })

  return accumulator
}

function start() {
  selection.cornerRadius = 100 // Not working
  const zoom = figma.viewport.zoom
  selection.strokeWeight = 1.5 / zoom
  selection.strokeJoin = 'ROUND'
  selection.blendMode = 'EXCLUSION'
  selection.strokes = [figma.util.solidPaint('#fff')]
  // To prevent vector selection
  selection.locked = true
  savedPosition = getMousePosition()

  interval = setInterval(() => {
    const position = getMousePosition()
    if (!position) {
      return
    }

    if (vertices.length > 100) {
      const { x: xv, y: yv } = vertices[0]
      const { x: xn, y: yn } = position
      const threshold = 3
      if (Math.abs(xv - xn) <= threshold && Math.abs(yv - yn) <= threshold) {
        stop(position)
        return
      }
    }

    const count = vertices.push(position)
    segments.push({ start: count - 1, end: count })
    if (segments[count - 2]) {
      segments[count - 2].end = count - 1
    }
    segments[count - 1].end = count - 1
    changeVector(position)
  }, 10)

  figma.currentPage.appendChild(selection)
}

async function stop(position: any) {
  clearInterval(interval)

  // Connect last point with first
  segments[vertices.length - 1].end = 0
  await changeVector(position)
  selection.locked = false

  vertices.length = 0
  segments.length = 0

  console.log('all', figma.currentPage.findAll())

  const intersections = traverseAndGetIntersections(
    figma.currentPage
      .findAll((node) => isNodeInViewport(node))
      .filter(({ id }) => id !== selection.id),
    selection,
  )

  console.log('inter', intersections)

  const result: any = []
  const groups: any = {}

  intersections.forEach((item) => {
    let clone: SceneNode
    if (item.type === 'FRAME') {
      clone = figma.createRectangle()
      // TODO: calc new gradients
      clone.fills = item.fills
      clone.resize(item.width, item.height)
    } else if (
      item.type === 'RECTANGLE' &&
      Array.isArray(item.fills) &&
      item.fills.some(({ type }) => type === 'IMAGE')
    ) {
      clone = item.clone()
      if (Array.isArray(item.fills)) {
        clone.fills = item.fills.map((fill) => {
          if (fill.type === 'IMAGE') {
            const newFill = JSON.parse(JSON.stringify(fill))
            newFill.scaleMode = 'CROP'
            const selectionX = selection.x
            const selectionY = selection.y
            const itemX = item.x
            const itemY = item.y
            const intersectionX = Math.max(selectionX, itemX)
            const intersectionY = Math.max(selectionY, itemY)
            const intersectionWidth =
              Math.min(selectionX + selection.width, itemX + item.width) -
              intersectionX
            const intersectionHeight =
              Math.min(selectionY + selection.height, itemY + item.height) -
              intersectionY
            const scaleX = intersectionWidth / item.width
            const scaleY = intersectionHeight / item.height
            const translateX = (intersectionX - item.x) / item.width
            const translateY = (intersectionY - item.y) / item.height
            newFill.imageTransform = [
              [scaleX, 0, translateX],
              [0, scaleY, translateY],
            ]
            return newFill
          }
          return fill
        })
      }
    } else {
      clone = item.clone()
    }
    // Copy position
    clone.relativeTransform = item.absoluteTransform
    figma.currentPage.appendChild(clone)
    const selectionClone = selection.clone()
    // Without fill intersection will not work
    selectionClone.fills = [figma.util.solidPaint('#fff')]
    figma.currentPage.appendChild(selectionClone)
    const intersection = figma.intersect(
      [selectionClone, clone],
      figma.currentPage,
    )
    if ('fills' in clone) intersection.fills = clone.fills
    if ('effects' in clone) intersection.effects = clone.effects
    if ('strokes' in clone) intersection.strokes = clone.strokes
    if ('strokeWeight' in clone) intersection.strokeWeight = clone.strokeWeight
    intersection.name = clone.name

    // TODO: fix unhandled promise rejection: Error: in flatten: Failed to apply flatten operation
    const flatNode = figma.flatten([intersection], figma.currentPage)
    result.push(flatNode)
  })

  console.log('result', result, groups)

  if (result.length) {
    const resultGroup = figma.group(result, figma.currentPage)
    resultGroup.name = 'Lasso Result'
  }

  selection.blendMode = 'NORMAL'
  const { hash } = await figma.createImageAsync(FILL_IMAGE)
  selection.strokes = [
    {
      blendMode: 'NORMAL',
      imageHash: hash,
      scaleMode: 'TILE',
      type: 'IMAGE',
    },
  ]

  figma.ui.postMessage({
    action: 'done',
  })
}

figma.ui.onmessage = (message: {
  action: string
  startPosition: any
  mode: string
}) => {
  switch (message.action) {
    case actions.START:
      selection = figma.createVector()
      start()
      break

    case actions.CANCEL:
      stop(getMousePosition())
      break
  }
}
