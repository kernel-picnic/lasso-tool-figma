import { Actions } from '@common/types/actions.ts'

const API_KEY = 'apiKey'
const ACTIONS_LIMIT_KEY = 'actionsLimit'
const DEFAULT_ACTIONS_LIMIT = 5

function setApiKey(apiKey: string) {
  return figma.clientStorage.setAsync(API_KEY, apiKey)
}

function getApiKey() {
  return figma.clientStorage.getAsync(API_KEY)
}

function getActionsLimit() {
  return figma.clientStorage
    .getAsync(ACTIONS_LIMIT_KEY)
    .then((limit) => limit ?? DEFAULT_ACTIONS_LIMIT)
}

function sendLimit(limit: number) {
  figma.ui.postMessage({
    action: Actions.PASTE_ACTIONS_LIMIT,
    limit,
  })
}

figma.ui.on('message', (message: { action: Actions; details: any }) => {
  switch (message.action) {
    case Actions.SET_API_KEY:
      setApiKey(message.details.apiKey)
      break

    case Actions.GET_API_KEY:
      getApiKey().then((apiKey) => {
        figma.ui.postMessage({
          action: Actions.PASTE_API_KEY,
          apiKey,
        })
      })
      break

    case Actions.GET_ACTIONS_LIMIT:
      getActionsLimit().then(sendLimit)
      break

    case Actions.COPY:
    case Actions.CUT:
      getApiKey().then((apiKey) => {
        if (apiKey) {
          return
        }
        getActionsLimit().then((limit) => {
          const remainingLimit = limit - 1
          if (remainingLimit < 0) {
            return
          }
          figma.clientStorage.setAsync(ACTIONS_LIMIT_KEY, remainingLimit)
          sendLimit(remainingLimit)
        })
      })
      break
  }
})
