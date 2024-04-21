import { Modes } from '@common/types/modes'
import { Actions } from '@common/types/actions'
import { getMousePosition } from '@plugin/utils/get-mouse-position'
import { nearestPositionToNode } from '@plugin/utils/nearest-position-to-node'
import { distanceToNodeSide } from '@plugin/utils/distance-to-node-side'
import { traverseAndGetIntersections } from '@plugin/utils/traverse-and-get-intersections'

const SELECTION_STROKE_BASE_WIDTH = 1.5
const SELECTION_INTERVAL = 10
const AUTOSTOP_THRESHOLD = 100
const MAGNETIC_DISTANCE = 30
const FILL_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAFCAYAAAB8ZH1oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAhSURBVHgBjcxBDQAACIBAdPavjBXgzW4ACS2x0wR2MY8PN64ECEABN0sAAAAASUVORK5CYII='

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { themeColors: true })

let selectionDrawInterval: any
let selection: VectorNode
let selectionChecker: any
let vertices: VectorVertex[] = []
let segments: any[] = []
// TODO: add type
let savedPosition: any = {}

const redrawSelection = (position: any = savedPosition) => {
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

const getMagneticPosition = (mousePosition: Vector): Vector | undefined => {
  const nodes = figma.currentPage.findAll()
  for (let node of nodes) {
    if (node.id === selection.id) {
      continue
    }
    if (!node.absoluteBoundingBox) {
      continue
    }
    const distance = distanceToNodeSide(mousePosition, node.absoluteBoundingBox)
    if (distance.x > MAGNETIC_DISTANCE || distance.y > MAGNETIC_DISTANCE) {
      continue
    }
    const nearestPosition = nearestPositionToNode(
      mousePosition,
      node.absoluteBoundingBox,
    )
    if (
      // If user already over node, node side can be far
      Math.abs(nearestPosition.x - mousePosition.x) > MAGNETIC_DISTANCE ||
      Math.abs(nearestPosition.y - mousePosition.y) > MAGNETIC_DISTANCE
    ) {
      continue
    }
    return nearestPosition
  }
}

function start(mode: Modes) {
  selection = figma.createVector()
  selection.cornerRadius = 100 // TODO: Not working
  selection.strokeJoin = 'ROUND' // TODO: Not working
  selection.blendMode = 'EXCLUSION'
  selection.strokes = [figma.util.solidPaint('#fff')]
  // To prevent vector selection
  selection.locked = true
  savedPosition = getMousePosition()
  figma.currentPage.appendChild(selection)

  selectionDrawInterval = setInterval(() => {
    let position = getMousePosition()
    if (!position) {
      return
    }

    // Dynamic zoom depending on current zoom
    selection.strokeWeight = SELECTION_STROKE_BASE_WIDTH / figma.viewport.zoom

    if (mode === Modes.MAGNETIC) {
      const magneticPosition = getMagneticPosition(position)
      if (magneticPosition) {
        position = magneticPosition
      }
    }

    if (vertices.length > AUTOSTOP_THRESHOLD) {
      const { x: xv, y: yv } = vertices[0]
      const { x: xn, y: yn } = position
      const thresholdPixels = 3
      if (
        Math.abs(xv - xn) <= thresholdPixels &&
        Math.abs(yv - yn) <= thresholdPixels
      ) {
        stop()
        return
      }
    }

    const count = vertices.push(position)
    segments.push({ start: count - 1, end: count })
    if (segments[count - 2]) {
      segments[count - 2].end = count - 1
    }
    segments[count - 1].end = count - 1
    redrawSelection(position)
  }, SELECTION_INTERVAL)
}

function cloneImageFills(
  intersection: BooleanOperationNode,
  node: RectangleNode,
): ImagePaint[] {
  if (!Array.isArray(node.fills)) {
    return []
  }

  const cloneFill = (fill: ImagePaint) => {
    const newFill = JSON.parse(JSON.stringify(fill))
    newFill.scaleMode = 'CROP'
    const scaleX = intersection.width / node.width
    const scaleY = intersection.height / node.height
    const translateX = (intersection.x - node.x) / node.width
    const translateY = (intersection.y - node.y) / node.height
    newFill.imageTransform = [
      [scaleX, 0, translateX],
      [0, scaleY, translateY],
    ]
    return newFill
  }

  return node.fills.map((fill: ImagePaint) => {
    if (fill.type === 'IMAGE') {
      return cloneFill(fill)
    }
    return fill
  })
}

function initChecker() {
  selectionChecker = setInterval(() => {
    if (selection.removed) {
      figma.ui.postMessage({
        action: Actions.SELECT_REMOVED,
      })
      clearInterval(selectionChecker)
    }
  }, 500)
}

async function stop() {
  clearInterval(selectionDrawInterval)

  // Connect last point with first
  segments[vertices.length - 1].end = 0
  await redrawSelection()
  selection.locked = false

  vertices.length = 0
  segments.length = 0

  selection.blendMode = 'NORMAL'
  const { hash } = await figma.createImageAsync(FILL_IMAGE)
  // TODO: stroke animation (?)
  selection.strokes = [
    {
      blendMode: 'NORMAL',
      imageHash: hash,
      scaleMode: 'TILE',
      type: 'IMAGE',
    },
  ]

  figma.ui.postMessage({ action: Actions.SELECT_END })
  initChecker()
  figma.currentPage.selection = [selection]
}

function applyAction(action: Actions) {
  console.log('all', figma.currentPage.findAll())

  const intersections = traverseAndGetIntersections(
    figma.currentPage.findAll(),
    selection,
  )

  console.log('inter', intersections)

  const result: any = []

  intersections.forEach((node) => {
    if (node.id === selection.id) {
      return
    }

    // TODO: refactoring
    try {
      let clone: SceneNode
      if (node.type === 'FRAME') {
        clone = figma.createRectangle()
        // TODO: calc new gradients
        clone.fills = node.fills
        clone.resize(node.width, node.height)
      } else {
        clone = node.clone()
      }

      // Copy position
      clone.relativeTransform = node.absoluteTransform
      figma.currentPage.appendChild(clone)
      const selectionClone = selection.clone()
      // Without fill intersection will not work
      selectionClone.fills = [figma.util.solidPaint('#fff')]
      figma.currentPage.appendChild(selectionClone)

      let intersection
      if (action === Actions.COPY) {
        intersection = figma.intersect(
          [selectionClone, clone],
          figma.currentPage,
        )
      } else {
        intersection = figma.subtract(
          [selectionClone, clone],
          figma.currentPage,
        )
      }

      if (
        clone.type === 'RECTANGLE' &&
        Array.isArray(clone.fills) &&
        clone.fills.some(({ type }) => type === 'IMAGE')
      ) {
        clone.fills = cloneImageFills(intersection, clone)
      }

      if ('fills' in clone) intersection.fills = clone.fills
      if ('effects' in clone) intersection.effects = clone.effects
      if ('strokes' in clone) intersection.strokes = clone.strokes
      if ('strokeWeight' in clone)
        intersection.strokeWeight = clone.strokeWeight
      intersection.name = clone.name

      const flatNode = figma.flatten([intersection], figma.currentPage)
      result.push(flatNode)
    } catch (e) {
      // TODO: fix unhandled promise rejection: Error: in flatten: Failed to apply flatten operation
      console.error('Error: ', e)
    }
  })

  console.log('result', result)

  if (result.length) {
    const resultGroup = figma.group(result, figma.currentPage)
    resultGroup.name = 'Lasso Result'
  }
}

figma.ui.onmessage = (message: { action: Actions; mode: Modes }) => {
  switch (message.action) {
    case Actions.START:
      start(message.mode)
      break

    case Actions.CANCEL:
      stop()
      break

    case Actions.COPY:
      applyAction(Actions.COPY)
      break

    case Actions.CROP:
      applyAction(Actions.CROP)
      break
  }
}
