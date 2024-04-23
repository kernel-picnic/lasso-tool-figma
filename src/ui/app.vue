<template>
  <lasso-instruction v-if="mode !== null" @cancel="cancel" />

  <!-- TODO: add help -->
  <!-- TODO: write that text nodes will be flatten in 'cut' mode -->
  <!-- TODO: optimize svgs -->
  <div v-else class="menu">
    <template v-if="isShowActions">
      <app-button @click="applyAction(actions.COPY)">
        <div class="icon"><img src="@ui/assets/rectangular.svg" alt="" /></div>
        Copy
      </app-button>
      <app-button @click="applyAction(actions.CUT)">
        <div class="icon"><img src="@ui/assets/rectangular.svg" alt="" /></div>
        Cut
      </app-button>
      <app-button @click="prettify">
        <div class="icon"><img src="@ui/assets/rectangular.svg" alt="" /></div>
        Prettify selection
      </app-button>
    </template>

    <template v-else>
      <app-button @click="setMode(modes.STANDARD)">
        <div class="icon"><img src="@ui/assets/standard-lasso.svg" alt="" /></div>
        Standard Lasso
      </app-button>
      <app-button @click="setMode(modes.MAGNETIC)">
        <div class="icon"><img src="@ui/assets/magnetic-lasso.svg" alt="" /></div>
        Magnetic Lasso
      </app-button>
      <app-button :disabled="!isActiveSelection" @click="applyLasso">
        <div class="icon"><img src="@ui/assets/rectangular.svg" alt="" /></div>
        Use as Lasso
      </app-button>
      <!-- TODO -->
      <!--      <app-button :disabled="true" @click="usePrevious">-->
      <!--        <img src="@ui/assets/rectangular.svg" alt="" />-->
      <!--        Use previous-->
      <!--      </app-button>-->
    </template>
  </div v-else>
</template>

<script>
import { Modes } from '@common/types/modes'
import { Actions } from '@common/types/actions'
import AppButton from '@ui/components/app-button.vue'
import LassoInstruction from '@ui/components/lasso-instruction.vue'
import { postPluginMessage } from './utils/post-plugin-message'

postPluginMessage({
  action: Actions.RESIZE_UI,
  details: { width: 250, height: 180 },
})

export default {
  name: 'App',
  components: {
    AppButton,
    LassoInstruction,
  },
  data() {
    return {
      mode: null,
      isShowActions: false,
      isActiveSelection: false,
    }
  },
  computed: {
    modes: () => Modes,
    actions: () => Actions,
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
    applyAction(action) {
      postPluginMessage({ action })
    },
    applyLasso() {
      postPluginMessage({ action: Actions.USE_AS_LASSO })
      this.isShowActions = true
    },
    cancel() {
      this.mode = null
      postPluginMessage({ action: Actions.CANCEL })
    },
    prettify() {
      postPluginMessage({ action: Actions.PRETTIFY_LASSO })
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
          this.isShowActions = false
          break

        case Actions.SELECT_STOP:
          this.mode = null
          this.isShowActions = true
          break
      }
    },
  },
}
</script>

<style>
:root {
  --font-family: 'Inter';
}

.figma-dark {
  --img-invert: 1;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  background-color: var(--figma-color-bg);
  color: var(--figma-color-text);
  padding: 0;
  margin: 0;
  font-family: var(--font-family), sans-serif;
}

img {
  filter: invert(var(--img-invert, 0));
}
</style>
