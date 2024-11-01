import { Actions } from '@common/types/actions'

const FEEDBACK_VARIABLE_NAME = 'feedback-shown'

figma.ui.on('message', (message: { action: Actions; details: any }) => {
  switch (message.action) {
    case Actions.GET_FEEDBACK_STATE:
      figma.clientStorage.getAsync(FEEDBACK_VARIABLE_NAME).then((wasShown) => {
        figma.ui.postMessage({
          action: Actions.PASTE_FEEDBACK_STATE,
          wasShown,
        })
      })
      break

    case Actions.SET_FEEDBACK_STATE:
      figma.clientStorage.setAsync(
        FEEDBACK_VARIABLE_NAME,
        message.details.state,
      )
  }
})
