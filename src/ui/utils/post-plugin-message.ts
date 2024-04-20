export const postPluginMessage = (data: Record<any, any>) => {
  parent.postMessage({ pluginMessage: data }, '*')
}
