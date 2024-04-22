import { Modes } from '@common/types/modes'
import { Actions } from '@common/types/actions'
import { getMousePosition } from '@plugin/utils/get-mouse-position'
import { nearestPositionToNode } from '@plugin/utils/nearest-position-to-node'
import { distanceToNodeSide } from '@plugin/utils/distance-to-node-side'
import { traverseAndGetIntersections } from '@plugin/utils/traverse-and-get-intersections'

const LASSO_STROKE_BASE_WIDTH = 1.5
const LASSO_DRAW_INTERVAL = 10
const AUTOSTOP_THRESHOLD = 100
const MAGNETIC_DISTANCE = 30
const FILL_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAFCAYAAAB8ZH1oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAhSURBVHgBjcxBDQAACIBAdPavjBXgzW4ACS2x0wR2MY8PN64ECEABN0sAAAAASUVORK5CYII='

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { themeColors: true })

let lassoDrawInterval: any
let lasso: VectorNode
let lassoChecker: any
let vertices: VectorVertex[] = []
let segments: any[] = []
// TODO: add type
let savedPosition: any = {}

const redrawLasso = (position: any = savedPosition) => {
  return lasso
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
      lasso.x = savedPosition.x
      lasso.y = savedPosition.y
    })
}

const getMagneticPosition = (mousePosition: Vector): Vector | undefined => {
  const nodes = figma.currentPage.findAll()
  for (let node of nodes) {
    if (node.id === lasso.id) {
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
    // TODO: fix wrong position in unknown cases
    return nearestPosition
  }
}

function start(mode: Modes) {
  figma.ui.postMessage({
    action: Actions.SELECT_START,
  })

  lasso = figma.createVector()
  lasso.cornerRadius = 100 // TODO: Not working
  lasso.strokeJoin = 'ROUND' // TODO: Not working
  lasso.blendMode = 'EXCLUSION'
  lasso.strokes = [figma.util.solidPaint('#fff')]
  // To prevent lasso being able selectable while drawing
  lasso.locked = true
  savedPosition = getMousePosition()
  figma.currentPage.appendChild(lasso)

  lassoDrawInterval = setInterval(() => {
    let position = getMousePosition()
    if (!position) {
      return
    }

    // Dynamic zoom depending on current zoom
    lasso.strokeWeight = LASSO_STROKE_BASE_WIDTH / figma.viewport.zoom

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
    redrawLasso(position)
  }, LASSO_DRAW_INTERVAL)
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
  lassoChecker = setInterval(() => {
    if (!lasso.removed) {
      return
    }
    figma.ui.postMessage({
      action: Actions.SELECT_CANCEL,
    })
    clearInterval(lassoChecker)
  }, 500)
}

function cancel() {
  clearInterval(lassoDrawInterval)
  figma.ui.postMessage({ action: Actions.SELECT_CANCEL })
  vertices.length = 0
  segments.length = 0
  if (lasso && !lasso.removed) {
    lasso.remove()
  }
}

async function stop() {
  clearInterval(lassoDrawInterval)
  figma.ui.postMessage({ action: Actions.SELECT_STOP })

  // Connect last point with first
  segments[vertices.length - 1].end = 0
  await redrawLasso()
  lasso.locked = false

  vertices.length = 0
  segments.length = 0

  lasso.blendMode = 'NORMAL'
  const { hash } = await figma.createImageAsync(FILL_IMAGE)
  // TODO: stroke animation (?)
  lasso.strokes = [
    {
      blendMode: 'NORMAL',
      imageHash: hash,
      scaleMode: 'TILE',
      type: 'IMAGE',
    },
  ]

  initChecker()
  figma.currentPage.selection = [lasso]
}

function copyLasso() {
  const lassoClone = lasso.clone()
  // Without fill intersection will not work
  lassoClone.fills = [figma.util.solidPaint('#fff')]
  return lassoClone
}

function copyNodeProperties(target: BooleanOperationNode, node: SceneNode) {
  if ('fills' in node) target.fills = node.fills
  if ('effects' in node) target.effects = node.effects
  if ('strokes' in node) target.strokes = node.strokes
  if ('strokeWeight' in node) target.strokeWeight = node.strokeWeight
  target.name = node.name
}

function copyNode(node: SceneNode) {
  let clone: SceneNode
  if (node.type === 'FRAME') {
    clone = figma.createRectangle()
    // TODO: calc new gradients
    clone.fills = node.fills
    clone.resize(node.width, node.height)
  } else {
    clone = node.clone()
  }
  clone.relativeTransform = node.absoluteTransform // Copy position
  const lassoClone = copyLasso()
  const intersection = figma.intersect([lassoClone, clone], figma.currentPage)
  if (
    clone.type === 'RECTANGLE' &&
    Array.isArray(clone.fills) &&
    clone.fills.some(({ type }) => type === 'IMAGE')
  ) {
    clone.fills = cloneImageFills(intersection, clone)
  }
  copyNodeProperties(intersection, clone)
  return figma.flatten([intersection], figma.currentPage)
}

function cutNode(node: SceneNode) {
  if (!node.parent) {
    return
  }
  let target = node
  // Because we can't cut something from frame node
  if (node.type === 'FRAME') {
    target = figma.createRectangle()
    target.fills = node.fills
    target.resize(node.width, node.height)
    target.name = node.name
    node.appendChild(target)
    node.fills = []
  }
  const index = node.parent.children.indexOf(node)
  const subtract = figma.subtract([copyLasso(), target], node.parent, index)
  copyNodeProperties(subtract, target)
  // TODO: add option to enable flatten for 'CUT' mode
  // figma.flatten(
  //   [subtract],
  //   node.parent,
  //   index,
  // )
  return copyNode(target)
}

function applyAction(action: Actions) {
  const intersections = traverseAndGetIntersections(
    figma.currentPage.findAll(),
    lasso,
  )

  const result: any = []
  intersections.forEach((node) => {
    try {
      if (node.id === lasso.id) {
        return
      }
      switch (action) {
        case Actions.COPY:
          result.push(copyNode(node))
          break

        case Actions.CUT:
          result.push(cutNode(node))
          break
      }
    } catch (e) {
      // TODO: fix unhandled promise rejection: Error: in flatten: Failed to apply flatten operation
      console.warn('Error: ', e)
    }
  })

  console.log('result', result)

  if (result.length) {
    // TODO: restore origin files order and tree
    const resultGroup = figma.group(result, figma.currentPage)
    resultGroup.name = 'Lasso Result'
    figma.currentPage.selection = [resultGroup]
  }

  lasso.remove()
}

figma.on('selectionchange', () => {
  const checkLasso = () => {
    if (figma.currentPage.selection.length !== 1) {
      return
    }
    const selection = figma.currentPage.selection[0]
    if (selection.type !== 'VECTOR') {
      return
    }
    return true
  }
  figma.ui.postMessage({
    action: Actions.SELECT_AVAILABLE,
    isActive: checkLasso(),
  })
})

figma.ui.onmessage = (message: {
  action: Actions
  mode: Modes
  details: any
}) => {
  switch (message.action) {
    case Actions.START:
      start(message.mode)
      break

    case Actions.CANCEL:
      cancel()
      break

    case Actions.COPY:
      applyAction(Actions.COPY)
      break

    case Actions.CUT:
      applyAction(Actions.CUT)
      break

    case Actions.RESIZE:
      figma.ui.resize(message.details.width, message.details.height)
      break
  }
}
