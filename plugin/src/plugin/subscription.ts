import { Actions } from '@common/types/actions'

const VARIABLE_NAME = 'licenseKey'
const ACTIONS_LIMIT_KEY = 'actionsLimit'
const DEFAULT_ACTIONS_LIMIT = 5

type LicenseInfo = Partial<{
  licenseKey: string
  instanceId: string
}>

function setLicenseInfo(info: LicenseInfo) {
  return figma.clientStorage.setAsync(VARIABLE_NAME, info)
}

function getLicenseInfo(): Promise<LicenseInfo> {
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
    case Actions.GET_LICENSE_INFO:
      getLicenseInfo().then((info = {}) => {
        figma.ui.postMessage({
          action: Actions.PASTE_LICENSE_INFO,
          userId: figma.currentUser?.id,
          ...info,
        })
      })
      break

    case Actions.SET_LICENSE_INFO:
      setLicenseInfo({
        licenseKey: message.details.licenseKey,
        instanceId: message.details.instanceId,
      })
      break

    case Actions.GET_ACTIONS_LIMIT:
      getActionsLimit().then(sendLimit)
      break

    case Actions.COPY:
    case Actions.CUT:
      getLicenseInfo().then((info) => {
        if (!info.licenseKey) {
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
