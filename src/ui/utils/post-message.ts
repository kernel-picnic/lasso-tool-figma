export const postMessage = (data: Record<any, any>) => {
  parent.postMessage({ pluginMessage: data }, '*')
}
