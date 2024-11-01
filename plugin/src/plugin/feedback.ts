import { Actions } from '@common/types/actions'
import { API_URL } from '@/constants.ts'

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
      break

    case Actions.SUBMIT_FEEDBACK:
      fetch(`${API_URL}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          ...message.details,
          userId: figma.currentUser?.id,
        }),
      })
      break
  }
})
