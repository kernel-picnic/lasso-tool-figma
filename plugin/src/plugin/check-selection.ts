import { Actions } from '@common/types/actions'

function check() {
  // TODO
  // figma.ui.postMessage({
  //   action: Actions.SELECT_CHANGED,
  // })

  const isSuitableForLasso = () => {
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
    isActive: isSuitableForLasso(),
  })
}

export const checkSelection = () => {
  figma.on('selectionchange', check)

  // Initial call
  if (figma.currentPage.selection.length) {
    check()
  }
}
