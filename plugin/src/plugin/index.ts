import { Modes } from '@common/types/modes'
import { Actions } from '@common/types/actions'
import { Mutable } from '@common/types/mutable'
import { getMousePosition } from '@plugin/utils/get-mouse-position'
import { getIntersections } from '@plugin/utils/traverse-and-get-intersections'
import { getMagneticPosition } from '@plugin/utils/get-magnetic-position'
import { cloneImageFill } from '@plugin/utils/clone-image-fill'
import { cloneLinearGradientFill } from '@plugin/utils/clone-linear-gradient-fill'
import { cloneRadialGradientFill } from '@plugin/utils/clone-radial-gradient-fill'
import { checkSelection } from '@plugin/check-selection'
import { deepClone } from '@plugin/utils/deep-clone'
import { detachAllInstances } from '@plugin/utils/detach-all-instances'
import './subscription'

const LASSO_STROKE_BASE_WIDTH = 1.5
const LASSO_DRAW_INTERVAL = 10
const LASSO_AUTOSTOP_MIN_VERTICES_COUNT = 50
const LASSO_AUTOSTOP_BASE_PIXELS_THRESHOLD = 15
const LASSO_RESULT_GROUP_NAME = 'Lasso Result'

const CONTAINER_NODE_TYPES = ['GROUP', 'FRAME', 'SECTION', 'INSTANCE']
type CONTAINER_NODE = GroupNode | FrameNode | SectionNode | InstanceNode

figma.showUI(__html__, { themeColors: true, width: 250, height: 240 })
checkSelection()

let lassoDrawInterval: any // TODO: add type
let lasso: VectorNode
let vertices: VectorVertex[] = []
let segments: any[] = [] // TODO: add type
let savedPosition: Mutable<Vector> | null = null

// TODO: move to service
let notification: NotificationHandler | undefined
function notify(message: string, options?: NotificationOptions | undefined) {
  notification?.cancel()
  notification = figma.notify(message, options)
}

const redrawLasso = (position = savedPosition) => {
  return lasso
    .setVectorNetworkAsync({
      vertices,
      segments,
    })
    .then(() => {
      if (!savedPosition || !position) {
        return
      }
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
  figma.currentPage.appendChild(lasso)

  lassoDrawInterval = setInterval(() => {
    // Assign saved position here, because if user will
    // move cursor too faster, first position will be too
    // far from the next position and lasso will be displaced
    if (!savedPosition) {
      savedPosition = getMousePosition()
    }

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

    if (
      vertices.length >
      Math.min(
        LASSO_AUTOSTOP_MIN_VERTICES_COUNT,
        LASSO_AUTOSTOP_MIN_VERTICES_COUNT / figma.viewport.zoom,
      )
    ) {
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

let lassoChecker: any
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
  savedPosition = null
  notification?.cancel()
  figma.ui.postMessage({ action: Actions.SELECT_CANCEL })
  figma.ui.show()
  if (lasso && !lasso.removed) {
    lasso.remove()
  }
}

async function stop() {
  clearInterval(lassoDrawInterval)
  prepareLasso()
  // Timeout to fire SELECT_STOP after SELECT_CHANGED
  setTimeout(() => figma.ui.postMessage({ action: Actions.SELECT_STOP }))
  // Connect the last point with the first
  segments[vertices.length - 1].end = 0
  await redrawLasso()
  savedPosition = null
  lasso.locked = false
  notify('Selection has been successfully completed')
  figma.ui.show()
}

function prepareLasso() {
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

function copyNodeProperties(target: SceneNode, node: SceneNode) {
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

function applyParentsCornerRadius(clone: SceneNode, node: SceneNode) {
  let traverse: any = node
  // TODO: write general traverse function
  while (traverse?.parent) {
    traverse = traverse.parent
    if (!('clipsContent' in traverse)) {
      continue
    }
    if (!traverse.clipsContent) {
      continue
    }
    const rect = figma.createRectangle()
    rect.resize(traverse.width, traverse.height)
    rect.relativeTransform = traverse.absoluteTransform
    copyNodeProperties(rect, traverse)
    clone = figma.flatten(
      [figma.intersect([rect, clone], figma.currentPage)],
      figma.currentPage,
    )
  }
  copyNodeProperties(clone, node)
  return clone
}

function copyNode(node: SceneNode) {
  let clone: SceneNode
  if (CONTAINER_NODE_TYPES.includes(node.type)) {
    clone = figma.createRectangle()
    copyNodeProperties(clone, node)
    clone.resize(node.width, node.height)
  } else {
    clone = node.clone()
  }

  clone.relativeTransform = node.absoluteTransform // Copy position
  clone = applyParentsCornerRadius(clone, node)
  const intersection = figma.intersect([copyLasso(), clone], figma.currentPage)

  if ('fills' in clone && Array.isArray(clone.fills)) {
    clone.fills = clone.fills.map((fill) => {
      switch (fill.type) {
        case 'IMAGE':
          return cloneImageFill(intersection, clone, fill)
        case 'GRADIENT_LINEAR':
          return cloneLinearGradientFill(intersection, clone, fill)
        case 'GRADIENT_RADIAL':
        case 'GRADIENT_ANGULAR':
        case 'GRADIENT_DIAMOND':
          return cloneRadialGradientFill(intersection, clone, fill)
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
  // Working with auto-layout is too complex,
  // so just disable it; anyway 'CUT' mode
  // breaks too much to care about it
  if ('layoutMode' in node && node.layoutMode !== 'NONE') {
    node.layoutMode = 'NONE'
  }
  let target = node
  // Because we can't cut something from
  // frames, sections and other similar nodes
  const isVirtualNode = CONTAINER_NODE_TYPES.includes(node.type)
  if (isVirtualNode) {
    node = node as CONTAINER_NODE
    target = figma.createRectangle()
    target.resize(node.width, node.height)
    node.appendChild(target)
    copyNodeProperties(target, node)
    // Clear origin styles to prevent styles layering
    if ('fills' in node) node.fills = []
    if ('strokes' in node) node.strokes = []
  }
  const parent = node.parent || figma.currentPage
  const index = isVirtualNode ? 0 : parent.children.indexOf(node)
  const subtract = figma.subtract(
    [copyLasso(), target],
    isVirtualNode ? (node as CONTAINER_NODE) : parent,
    index,
  )
  copyNodeProperties(subtract, target)
  // TODO: add option to enable/disable flatten for 'CUT' mode
  // const flat = figma.flatten([subtract], parent, index)
  return [copyNode(target), subtract]
}

function applyAction(action: Actions) {
  let intersections = getIntersections(lasso)

  const result: any = []

  // Detach components, because we can't
  // use components for 'CUT' mode
  if (action === Actions.CUT) {
    detachAllInstances(intersections)
    // Get new intersections, because after detaching
    // old nodes are not available
    intersections = getIntersections(lasso)
  }

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
      // If node is visible, but parent is invisible
      if (
        'absoluteRenderBounds' in node &&
        node.absoluteRenderBounds === null
      ) {
        return
      }
      let copy
      switch (action) {
        case Actions.COPY:
          copy = copyNode(node)
          break
        case Actions.CUT:
          const [result] = cutNode(node)
          copy = result
          break
      }
      result.push(copy)
    } catch (e) {
      // TODO: fix unhandled promise rejection: Error: in flatten: Failed to apply flatten operation
      console.warn('Error process intersection: ', node.name, e)
    }
  })

  // TODO: restore groups tree
  if (result.length) {
    try {
      const resultGroup = figma.group(result, figma.currentPage)
      resultGroup.name = LASSO_RESULT_GROUP_NAME
    } catch (e) {
      console.warn('Error creating group: ', e)
    }
  }

  lasso.remove() // TODO: don't remove "Use as Lasso" selected vector
  notify('Done!')
  figma.ui.postMessage({
    action: Actions.ACTION_FINISHED,
  })
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
      // TODO: handle "Unable to establish connection to Figma after 10 seconds. Please check your internet connection."
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
