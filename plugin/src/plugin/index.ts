import { Modes } from '@common/types/modes'
import { Actions } from '@common/types/actions'
import { getMousePosition } from '@plugin/utils/get-mouse-position'
import { getIntersections } from '@plugin/utils/traverse-and-get-intersections'
import { getMagneticPosition } from '@plugin/utils/get-magnetic-position'
import { cloneImageFill } from '@plugin/utils/clone-image-fill'
import { cloneGradientFill } from '@plugin/utils/clone-gradient-fill'
import { checkSelection } from '@plugin/check-selection'
import { deepClone } from '@plugin/utils/deep-clone'
import './subscription'

const LASSO_STROKE_BASE_WIDTH = 1.5
const LASSO_DRAW_INTERVAL = 10
const LASSO_AUTOSTOP_MIN_VERTICES_COUNT = 100
const LASSO_AUTOSTOP_BASE_PIXELS_THRESHOLD = 5
const LASSO_RESULT_GROUP_NAME = 'Lasso Result'

figma.showUI(__html__, { themeColors: true, width: 250, height: 210 })
checkSelection()

// TODO: add types
let lassoDrawInterval: any
let lasso: VectorNode
let lassoChecker: any
let vertices: VectorVertex[] = []
let segments: any[] = []
let savedPosition: any = {}

// TODO: move to service
let notification: NotificationHandler | undefined
function notify(message: string, options?: NotificationOptions | undefined) {
  notification?.cancel()
  notification = figma.notify(message, options)
}

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

function start(mode: Modes) {
  figma.ui.postMessage({
    action: Actions.SELECT_START,
  })

  // Reset previous selection
  vertices.length = 0
  segments.length = 0

  lasso = figma.createVector()
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
      const magneticPosition = getMagneticPosition(position, lasso.id)
      if (magneticPosition) {
        position = magneticPosition
      }
    }

    if (vertices.length > LASSO_AUTOSTOP_MIN_VERTICES_COUNT) {
      const { x: xv, y: yv } = vertices[0]
      const { x: xn, y: yn } = position
      const thresholdPixels =
        LASSO_AUTOSTOP_BASE_PIXELS_THRESHOLD / figma.viewport.zoom
      if (
        Math.abs(xv - xn) <= thresholdPixels &&
        Math.abs(yv - yn) <= thresholdPixels
      ) {
        stop()
        return
      }
    }

    const count = vertices.push({
      ...position,
      // cornerRadius: 5, // Breaks copy and cut
      strokeJoin: 'ROUND',
    })
    segments.push({ start: count - 1, end: count })
    if (segments[count - 2]) {
      segments[count - 2].end = count - 1
    }
    segments[count - 1].end = count - 1
    redrawLasso(position)
  }, LASSO_DRAW_INTERVAL)
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
  notification?.cancel()
  figma.ui.postMessage({ action: Actions.SELECT_CANCEL })
  figma.ui.show()
  if (lasso && !lasso.removed) {
    lasso.remove()
  }
}

async function stop() {
  clearInterval(lassoDrawInterval)
  figma.ui.postMessage({ action: Actions.SELECT_STOP })
  // Connect the last point with the first
  segments[vertices.length - 1].end = 0
  await redrawLasso()
  lasso.locked = false
  notify('Selection has been successfully completed')
  figma.ui.show()
  prepareLasso()
}

async function prepareLasso() {
  // TODO: stroke animation (?)
  initChecker()
  figma.currentPage.selection = [lasso]
}

function copyLasso() {
  const lassoClone = lasso.clone()
  // Without fill intersection will not work
  lassoClone.fills = [figma.util.solidPaint('#fff')]
  // Fix position if lasso in frame
  lassoClone.relativeTransform = lasso.absoluteTransform
  return lassoClone
}

function copyNodeProperties(target: BooleanOperationNode, node: SceneNode) {
  try {
    target.name = node.name
    if ('strokes' in node) target.strokes = node.strokes
    if ('effects' in node) target.effects = node.effects
    if ('strokeWeight' in node) target.strokeWeight = node.strokeWeight
    if ('fills' in node) target.fills = node.fills
  } catch (e) {
    // TODO: fix "Cannot unwrap symbol"
    console.warn('Error copy node properties: ', e)
  }
}

function copyNode(node: SceneNode) {
  let clone: SceneNode
  if (node.type === 'FRAME') {
    clone = figma.createRectangle()
    clone.fills = node.fills
    clone.resize(node.width, node.height)
  } else {
    clone = node.clone()
  }

  clone.relativeTransform = node.absoluteTransform // Copy position
  const lassoClone = copyLasso()
  const intersection = figma.intersect([lassoClone, clone], figma.currentPage)

  if ('fills' in clone && Array.isArray(clone.fills)) {
    clone.fills = clone.fills.map((fill) => {
      switch (fill.type) {
        case 'IMAGE':
          return cloneImageFill(intersection, clone, fill)
        case 'GRADIENT_LINEAR':
          return cloneGradientFill(intersection, clone, fill)
        default:
          return fill
      }
    })
  }

  copyNodeProperties(intersection, clone)
  return figma.flatten([intersection], figma.currentPage)
}

function cutNode(node: SceneNode) {
  if (!node.parent) {
    return []
  }
  let target = node
  const isFrame = node.type === 'FRAME'
  // Because we can't cut something from frame node
  if (isFrame) {
    target = figma.createRectangle()
    target.fills = node.fills
    target.resize(node.width, node.height)
    target.name = node.name
    node.appendChild(target)
    node.fills = []
  }
  const parent = node.parent
  const index = parent.children.indexOf(node)
  const subtract = figma.subtract(
    [copyLasso(), target],
    isFrame ? node : parent,
    isFrame ? 0 : index,
  )
  copyNodeProperties(subtract, target)
  // TODO: add option to enable flatten for 'CUT' mode
  // figma.flatten(
  //   [subtract],
  //   parent,
  //   index,
  // )
  return [copyNode(target), subtract]
}

function applyAction(action: Actions) {
  const intersections = getIntersections(lasso)

  const groups: Map<any, any> = new Map()
  groups.set(figma.currentPage.id, {
    children: [],
    parent: figma.currentPage,
  })
  intersections.forEach((node) => {
    if (!['GROUP', 'FRAME'].includes(node.type)) {
      return
    }
    groups.set(node.id, {
      children: [],
      name: node.name,
      parent: node.parent,
    })
  })

  intersections.forEach((node) => {
    try {
      if (node.type === 'GROUP') {
        return
      }
      if (!node.parent) {
        return
      }
      if (node.id === lasso.id) {
        return
      }
      let copy
      let groupNode
      switch (action) {
        case Actions.COPY:
          copy = copyNode(node)
          groupNode = node
          break
        case Actions.CUT:
          const [result, subtract] = cutNode(node)
          copy = result
          groupNode = subtract
          break
      }
      if (!groupNode?.parent) {
        return
      }
      const key = groupNode.parent.id
      const group = groups.get(key)
      groups.set(key, { ...group, children: [...group.children, copy] })
    } catch (e) {
      // TODO: fix unhandled promise rejection: Error: in flatten: Failed to apply flatten operation
      console.warn('Error process intersection: ', e)
    }
  })

  if (!groups.size) {
    return
  }

  // Figma cannot create empty groups - use filler for it
  const filler = figma.createBooleanOperation()
  // Restore original groups tree
  groups.forEach(({ children, name, parent }, id) => {
    const parentGroup = groups.get(parent.id).group || figma.currentPage
    const group = figma.group(
      children.length ? children : [filler],
      parentGroup,
    )
    group.name = name || LASSO_RESULT_GROUP_NAME
    groups.set(id, { ...groups.get(id), group })
  })

  filler.remove()
  lasso.remove() // TODO: don't remove "Use as Lasso" selected vector
  notify('Done!')
}

function useCurrentSelectionAsLasso() {
  lasso = figma.currentPage.selection[0] as VectorNode
  vertices = deepClone(lasso.vectorNetwork.vertices) as VectorVertex[]
  segments = deepClone(lasso.vectorNetwork.segments) as VectorSegment[]
  prepareLasso()
}

function prettify() {
  const TOLERANCE = 10

  // Initialize simplified path with the first point
  const simplifiedVertices = [vertices[0]]

  let currentPoint = null
  let lastPoint = vertices[0]
  for (let i = 1; i < vertices.length; i++) {
    currentPoint = vertices[i]

    // Calculate the distance between the last point and the current point
    const distance = Math.sqrt(
      Math.pow(currentPoint.x - lastPoint.x, 2) +
        Math.pow(currentPoint.y - lastPoint.y, 2),
    )

    if (distance > TOLERANCE) {
      simplifiedVertices.push(currentPoint)
      lastPoint = currentPoint
    }
  }

  vertices = simplifiedVertices
  segments = simplifiedVertices.map((_, index) => {
    return { start: index, end: index + 1 }
  })
  segments[segments.length - 1].end = 0

  redrawLasso()
}

figma.on('close', cancel)

figma.ui.on('message', (message: { action: Actions; details: any }) => {
  switch (message.action) {
    case Actions.START:
      figma.ui.hide()
      // TODO: handle notification close event
      notify(
        'Select desired area and move cursor to the start point to end selecting',
        {
          timeout: 7000,
          button: {
            text: 'Cancel',
            action: cancel,
          },
        },
      )
      start(message.details.mode)
      break

    case Actions.CANCEL:
      notification?.cancel()
      cancel()
      break

    case Actions.COPY:
      applyAction(Actions.COPY)
      break

    case Actions.CUT:
      applyAction(Actions.CUT)
      break

    case Actions.USE_AS_LASSO:
      useCurrentSelectionAsLasso()
      break

    case Actions.PRETTIFY_LASSO:
      prettify()
      break

    case Actions.RESIZE_UI:
      figma.ui.resize(message.details.width, message.details.height)
      break

    case Actions.NOTIFY:
      notify(message.details.message, message.details.options)
      break
  }
})
