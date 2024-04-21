<template>
  <img src="@ui/assets/standard-lasso.svg" alt="Lasso Tool" />
  <app-button @click="setMode(modes.STANDARD)">Standard Lasso</app-button>
  <app-button @click="setMode(modes.MAGNETIC)">Magnetic Lasso</app-button>
  <app-button @click="stop">Cancel</app-button>

  <template v-if="showActions">
    <app-button @click="applyAction(actions.COPY)">Copy</app-button>
    <app-button @click="applyAction(actions.CROP)">Crop</app-button>
  </template>
</template>

<script>
import { Modes } from '@common/types/modes'
import { Actions } from '@common/types/actions'
import { postPluginMessage } from './utils/post-plugin-message'
import AppButton from '@ui/components/app-button.vue'

export default {
  name: 'App',
  components: {
    AppButton,
  },
  data() {
    return {
      mode: null,
      showActions: false,
    }
  },
  computed: {
    modes: () => Modes,
    actions: () => Actions,
  },
  mounted() {
    window.addEventListener('blur', this.start)
    onmessage = ({ data }) => this.handleMessages(data.pluginMessage)
  },
  beforeUnmount() {
    window.removeEventListener('blur', this.start)
  },
  methods: {
    setMode(mode) {
      this.mode = mode
    },
    start() {
      if (this.mode === null) {
        return
      }
      postPluginMessage({
        action: Actions.START,
        mode: this.mode,
      })
    },
    stop() {
      this.mode = null
      postPluginMessage({ action: Actions.CANCEL })
    },
    applyAction(action) {
      postPluginMessage({ action })
    },
    handleMessages(message) {
      switch (message.action) {
        case Actions.SELECT_END:
          this.mode = null
          this.showActions = true
          break

        case Actions.SELECT_REMOVED:
          this.showActions = false
      }
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
