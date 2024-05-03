import { Actions } from '@common/types/actions'

const VARIABLE_NAME = 'licenseKey'
const ACTIONS_LIMIT_KEY = 'actionsLimit'
const DEFAULT_ACTIONS_LIMIT = 5

function setLicenseKey(licenseKey: string) {
  return figma.clientStorage.setAsync(VARIABLE_NAME, licenseKey)
}

function getLicenseKey() {
  return figma.clientStorage.getAsync(VARIABLE_NAME)
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
    case Actions.STORE_LICENSE_KEY:
      setLicenseKey(message.details.licenseKey)
      break

    case Actions.GET_LICENSE_KEY:
      getLicenseKey().then((licenseKey) => {
        figma.ui.postMessage({
          action: Actions.PASTE_LICENSE_KEY,
          licenseKey,
        })
      })
      break

    case Actions.GET_ACTIONS_LIMIT:
      getActionsLimit().then(sendLimit)
      break

    case Actions.COPY:
    case Actions.CUT:
      getLicenseKey().then((licenseKey) => {
        if (licenseKey) {
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
