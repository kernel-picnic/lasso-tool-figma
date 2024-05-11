import { Modes } from '@common/types/modes'
import { Actions } from '@common/types/actions'
import { Mutable } from '@common/types/mutable'
import { getMousePosition } from '@plugin/utils/get-mouse-position'
import { getIntersections } from '@plugin/utils/traverse-and-get-intersections'
import { getMagneticPosition } from '@plugin/utils/get-magnetic-position'
import { checkSelection } from '@plugin/check-selection'
import { deepClone } from '@plugin/utils/deep-clone'
import { detachAllInstances } from '@plugin/utils/detach-all-instances'
import { copyNode } from '@plugin/actions/copy-node'
import { cutNode } from '@plugin/actions/cut-node'
import './subscription'

const LASSO_STROKE_BASE_WIDTH = 1.5
const LASSO_DRAW_INTERVAL = 10
const LASSO_AUTOSTOP_MIN_VERTICES_COUNT = 50
const LASSO_AUTOSTOP_BASE_PIXELS_THRESHOLD = 15
const LASSO_RESULT_GROUP_NAME = 'Lasso Result'

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
    if (lasso.removed) {
      cancel()
      return
    }

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

function finishAction(nodes: SceneNode[]) {
  // TODO: restore groups tree
  if (nodes.length) {
    try {
      const group = figma.group(nodes, figma.currentPage)
      group.name = LASSO_RESULT_GROUP_NAME
      figma.currentPage.selection = [group]
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

  const processNode = (node: SceneNode, i: number) => {
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
          copy = copyNode(node, copyLasso())
          break
        case Actions.CUT:
          const [result] = cutNode(node, copyLasso())
          copy = result
          break
      }
      result.push(copy)
    } catch (e) {
      // TODO: fix unhandled promise rejection: Error: in flatten: Failed to apply flatten operation
      console.warn('Error process intersection: ', node.name, e)
    } finally {
      if (i === intersections.length - 1) {
        finishAction(result)
      }
    }
  }

  intersections.forEach((node, i) => {
    setTimeout(() => processNode(node, i), 1)
  })
}

function useCurrentSelectionAsLasso() {
  lasso = figma.currentPage.selection[0] as VectorNode
  vertices = deepClone(lasso.vectorNetwork.vertices) as VectorVertex[]
  segments = deepClone(lasso.vectorNetwork.segments) as VectorSegment[]
  prepareLasso()
}

function prettifyLasso() {
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
      // TODO: handle notification 'close' event
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
      prettifyLasso()
      break

    case Actions.RESIZE_UI:
      figma.ui.resize(message.details.width, message.details.height)
      break

    case Actions.NOTIFY:
      notify(message.details.message, message.details.options)
      break
  }
})
