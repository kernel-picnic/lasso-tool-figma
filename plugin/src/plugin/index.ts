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
import { prettifyLasso } from '@plugin/actions/prettify-lasso'
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
let vertices: Mutable<VectorVertex>[] = []
let segments: Mutable<VectorSegment>[] = []
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
  savedPosition = null

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
  lasso.locked = false
  notify('Selection has been successfully completed')
  figma.ui.show()
}

function prepareLasso() {
  // TODO: stroke animation (?)
  initChecker()
  figma.currentPage.selection = [lasso]
}

export function copyLasso() {
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

let isMustCancelAction = false
function cancelAction() {
  isMustCancelAction = true
}

async function applyAction(action: Actions) {
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

  for (let i = 0; i < intersections.length; i++) {
    if (isMustCancelAction) {
      isMustCancelAction = false
      break
    }

    const node = intersections[i]

    try {
      if (node.type === 'GROUP') {
        continue
      }
      if (!node.parent) {
        continue
      }
      if (node.id === lasso.id) {
        continue
      }
      // If node is visible, but parent is invisible
      if (
        'absoluteRenderBounds' in node &&
        node.absoluteRenderBounds === null
      ) {
        continue
      }
      let copy
      switch (action) {
        case Actions.COPY:
          copy = await copyNode(node)
          break
        case Actions.CUT:
          const [result] = await cutNode(node)
          copy = result
          break
      }
      result.push(copy)
    } catch (e) {
      // TODO: fix unhandled promise rejection: Error: in flatten: Failed to apply flatten operation
      console.warn('Error process intersection: ', node.name, e)
    }

    // Performance optimization
    await new Promise((resolve) => setTimeout(resolve))
  }

  finishAction(result)
}

function cloneLassoProperties() {
  segments = deepClone(lasso.vectorNetwork.segments)
  vertices = deepClone(lasso.vectorNetwork.vertices)
}

function applyPrettify() {
  lasso = prettifyLasso(lasso)
  cloneLassoProperties()
  redrawLasso()
  notify('Prettify successfully applied')
}

function useCurrentSelectionAsLasso() {
  lasso = figma.currentPage.selection[0] as VectorNode
  cloneLassoProperties()
  savedPosition = { x: lasso.x, y: lasso.y }
  prepareLasso()
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

    case Actions.ACTION_CANCEL:
      cancelAction()
      break

    case Actions.PRETTIFY_LASSO:
      applyPrettify()
      break

    case Actions.RESIZE_UI:
      figma.ui.resize(message.details.width, message.details.height)
      break

    case Actions.NOTIFY:
      notify(message.details.message, message.details.options)
      break
  }
})
