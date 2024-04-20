<template>
  <img src="@ui/assets/logo.svg" alt="Lasso Tool" />
  <app-button @click="setMode('standard')">Standard Lasso</app-button>
  <app-button @click="setMode('polygonal')">Polygonal Lasso</app-button>
  <app-button @click="stop">Cancel</app-button>
</template>

<script>
import AppButton from '@ui/components/app-button.vue'

export default {
  name: 'App',
  components: {
    AppButton,
  },
  data() {
    return {
      mode: null,
    }
  },
  mounted() {
    window.addEventListener('blur', this.start)
    onmessage = (event) => {
      console.log('got this from the plugin code', event.data.pluginMessage)
    }
  },
  beforeUnmount() {
    window.removeEventListener('blur', this.start)
  },
  methods: {
    setMode(mode) {
      this.mode = mode
    },
    start() {
      if (!this.mode) {
        return
      }
      parent.postMessage(
        {
          pluginMessage: {
            action: 'start',
            mode: 'lasso',
          },
        },
        '*',
      )
    },
    stop() {
      this.mode = null
      parent.postMessage({ pluginMessage: { action: 'cancel' } }, '*')
    },
  },
}
</script>

<style>
body {
  background-color: var(--figma-color-bg);
  color: var(--figma-color-text);
}
</style>
