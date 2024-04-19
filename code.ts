const isIntersected = (outer: Rect, inner: Rect): boolean => {
  const innerTop = inner.y
  const innerRight = inner.x + inner.width
  const innerBottom = inner.y + inner.height
  const innerLeft = inner.x

  const outerTop = outer.y
  const outerRight = outer.x + outer.width
  const outerBottom = outer.y + outer.height
  const outerLeft = outer.x

  return !(
    innerRight < outerLeft ||
    innerLeft > outerRight ||
    innerBottom < outerTop ||
    innerTop > outerBottom
  )
}

const notEmpty = <TValue>(value: null | TValue | undefined): value is TValue =>
  value !== null && value !== undefined

const isEmpty = <TValue>(
  value: null | TValue | undefined,
): value is null | undefined => value === null || value === undefined

const hasBoundingBox = (
  node: SceneNode,
): node is SceneNode & { absoluteBoundingBox: Rect } =>
  'absoluteBoundingBox' in node && notEmpty(node.absoluteBoundingBox)

const areNodesIntersecting = (
  node: SceneNode,
  selectedNode: SceneNode,
): boolean => {
  if (!hasBoundingBox(selectedNode)) {
    return false
  }

  return (
    hasBoundingBox(node) &&
    isIntersected(node.absoluteBoundingBox, selectedNode.absoluteBoundingBox) &&
    'visible' in node &&
    node.visible
  )
}

// This shows the HTML page in "ui.html".
figma.showUI(__html__)

const getMousePosition = (): any => {
  const { position }: { position: any } = figma.activeUsers[0]
  if (!position) {
    return
  }
  const x = Math.round(position.x)
  const y = Math.round(position.y)
  return { x, y }
}

let interval: any
let selection: VectorNode
const vertices: any[] = []
const segments: any[] = []
// TODO: add type
let savedPosition: any = {}
// const background = figma.createRectangle()
// background.x = figma.viewport.bounds.x
// background.y = figma.viewport.bounds.y
// background.resize(figma.viewport.bounds.width, figma.viewport.bounds.height)
// background.fills = []
// figma.currentPage.appendChild(background)

const changeSelectionNetwork = (position: any) => {
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

function isNodeInViewport(node: SceneNode) {
  const nodeBounds = node.absoluteBoundingBox

  if (!nodeBounds) {
    return false
  }
  return (
    nodeBounds.x + nodeBounds.width >= figma.viewport.bounds.x &&
    nodeBounds.x <= figma.viewport.bounds.x + figma.viewport.bounds.width &&
    nodeBounds.y + nodeBounds.height >= figma.viewport.bounds.y &&
    nodeBounds.y <= figma.viewport.bounds.y + figma.viewport.bounds.height
  )
}

const stopLasso = async (position: any) => {
  clearInterval(interval)

  // const zoom = figma.viewport.zoom
  // selection.dashPattern= [10 / zoom, 10 / zoom]
  segments[vertices.length - 1].end = 0
  await changeSelectionNetwork(position)

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

    // let parentName = 'root'
    // // @ts-ignore
    // if (item.parent && item.type !== 'PAGE' && item.type !== 'FRAME') {
    //   parentName = item.parent.name
    // }
    // if (!groups[parentName]) {
    //   groups[parentName] = {
    //     nodes: [],
    //     parent: item.parent,
    //   }
    // }
    // groups[parentName].nodes.push(flatNode)
  })

  console.log('result', result, groups)

  // Object.entries(groups).forEach(
  //   ([name, groupData]: [name: any, groupData: any]) => {
  //     const groupNode = figma.group(groupData.nodes, groupData.parent)
  //     groupNode.name = name
  //     result.appendChild(groupNode)
  //   },
  // )
  const resultGroup = figma.group(result, figma.currentPage)
  resultGroup.name = 'Lasso Result'

  selection.remove()
}

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = (msg: {
  type: string
  startPosition: any
  mode: string
}) => {
  selection = figma.createVector()

  if (msg.type === 'start') {
    selection.cornerRadius = 100 // Not working
    const zoom = figma.viewport.zoom
    selection.strokeWeight = 1 / zoom
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
          stopLasso(position)
          return
        }
      }

      const count = vertices.push(position)
      segments.push({ start: count - 1, end: count })
      if (segments[count - 2]) {
        segments[count - 2].end = count - 1
      }
      segments[count - 1].end = count - 1
      changeSelectionNetwork(position)
    }, 10)

    figma.currentPage.appendChild(selection)
    // document.addEventListener('mousemove', (e) => {
    //   console.log(e);
    // })
    // figma.viewport.scrollAndZoomIntoView(nodes);
  }

  if (msg.type === 'cancel') {
    stopLasso(getMousePosition())
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  // figma.closePlugin();
}
