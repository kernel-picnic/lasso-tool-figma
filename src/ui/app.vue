<template>
  <lasso-instruction v-if="mode !== null" @cancel="cancel" />

  <!-- TODO: add help -->
  <!-- TODO: write that text nodes will be flatten in 'cut' mode -->
  <div v-else class="menu">
    <template v-if="showActions">
      <app-button @click="applyAction(actions.COPY)">
        <img src="@ui/assets/rectangular.svg" alt="" />
        Copy
      </app-button>
      <app-button @click="applyAction(actions.CUT)">
        <img src="@ui/assets/rectangular.svg" alt="" />
        Cut
      </app-button>
    </template>

    <template v-else>
      <app-button @click="setMode(modes.STANDARD)">
        <img src="@ui/assets/standard-lasso.svg" alt="" />
        Standard Lasso
      </app-button>
      <app-button @click="setMode(modes.MAGNETIC)">
        <img src="@ui/assets/magnetic-lasso.svg" alt="" />
        Magnetic Lasso
      </app-button>
      <app-button :disabled="!isActiveSelection" @click="applyLasso">
        <img src="@ui/assets/rectangular.svg" alt="" />
        Use as Lasso
      </app-button>
      <!-- TODO -->
      <app-button :disabled="true" @click="applyLasso">
        <img src="@ui/assets/rectangular.svg" alt="" />
        Use previous
      </app-button>
    </template>
  </div>
</template>

<script>
import { Modes } from '@common/types/modes'
import { Actions } from '@common/types/actions'
import AppButton from '@ui/components/app-button.vue'
import LassoInstruction from '@ui/components/LassoInstruction.vue'
import { postPluginMessage } from './utils/post-plugin-message'

export default {
  name: 'App',
  components: {
    AppButton,
    LassoInstruction,
  },
  data() {
    return {
      mode: null,
      showActions: false,
      isActiveSelection: false,
    }
  },
  computed: {
    modes: () => Modes,
    actions: () => Actions,
  },
  watch: {
    mode: {
      immediate: true,
      handler() {
        let size
        if (this.mode === null) {
          size = { width: 300, height: 130 }
        } else {
          size = { width: 300, height: 300 }
        }
        postPluginMessage({
          action: Actions.RESIZE,
          details: size,
        })
      },
    },
  },
  mounted() {
    window.addEventListener('blur', this.start)
    window.addEventListener('message', this.handleMessages)
  },
  beforeUnmount() {
    window.removeEventListener('blur', this.start)
    window.removeEventListener('message', this.handleMessages)
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
    applyLasso() {
      // TODO
    },
    cancel() {
      this.mode = null
      postPluginMessage({ action: Actions.CANCEL })
    },
    applyAction(action) {
      postPluginMessage({ action })
    },
    // TODO: move to common service
    handleMessages({ data }) {
      const message = data.pluginMessage

      switch (message.action) {
        case Actions.SELECT_AVAILABLE:
          this.isActiveSelection = message.isActive
          break

        case Actions.SELECT_CANCEL:
          this.mode = null
          this.showActions = false
          break

        case Actions.SELECT_STOP:
          this.mode = null
          this.showActions = true
          break
      }
    },
  },
}
</script>

<style>
body {
  background-color: var(--figma-color-bg);
  color: var(--figma-color-text);
  padding: 0;
  margin: 0;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}
</style>

<style scoped>
.menu {
  display: flex;
  gap: 20px;
  padding: 20px;
}
</style>
