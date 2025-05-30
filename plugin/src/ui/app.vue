<template>
  <div v-if="!isModeSelected" class="topbar">
    <template v-if="isShowActions">Choose action</template>
    <template v-else>Choose tool</template>
    <a href="#" @click.prevent="openHelp">Help</a>
  </div>

  <help-info v-if="showHelpPopup" @close="closeHelp" />

  <lasso-instruction v-if="isModeSelected" @cancel="cancel" />

  <template v-else>
    <div v-if="isActionRunning" class="loader">
      <!-- TODO: fix loader freeze -->
      <img src="@ui/assets/loader.svg" alt="" />
      <common-button @click="cancelAction">Cancel</common-button>
    </div>

    <template v-if="isShowActions">
      <menu-button @click="applyAction(actions.COPY)">
        <div class="icon"><img src="@ui/assets/copy.svg" alt="" /></div>
        Copy
      </menu-button>
      <menu-button @click="applyAction(actions.CUT)">
        <div class="icon"><img src="@ui/assets/cut.svg" alt="" /></div>
        Cut
        <common-tooltip theme="warning">
          <template #icon>!</template>
          Cut mode will change original layers. Before doing this, back up your
          important layers.
        </common-tooltip>
      </menu-button>
      <menu-button @click="prettify">
        <div class="icon"><img src="@ui/assets/prettify.svg" alt="" /></div>
        Prettify Path
      </menu-button>
      <!-- TODO -->
      <!--      <app-button @click="cancel">-->
      <!--        <img src="@ui/assets/cancel.svg" alt="" />-->
      <!--        Cancel-->
      <!--      </app-button>-->
    </template>

    <template v-else>
      <!-- TODO -->
      <!--      <div>Advanced settings</div>-->
      <menu-button @click="setMode(modes.STANDARD)">
        <div class="icon">
          <img src="@ui/assets/standard-lasso.svg" alt="" />
        </div>
        Standard Lasso
      </menu-button>
      <menu-button @click="setMode(modes.MAGNETIC)">
        <div class="icon">
          <img src="@ui/assets/magnetic-lasso.svg" alt="" />
        </div>
        Magnetic Lasso
      </menu-button>
      <menu-button :disabled="!isActiveSelection" @click="applyLasso">
        <div class="icon"><img src="@ui/assets/rectangular.svg" alt="" /></div>
        Use as Lasso
        <common-tooltip v-if="!isActiveSelection">
          Choose any <i>vector</i> on&nbsp;the&nbsp;page to&nbsp;use&nbsp;it
          as&nbsp;a&nbsp;lasso
        </common-tooltip>
      </menu-button>
      <!-- TODO -->
      <!--      <app-button :disabled="true" @click="usePrevious">-->
      <!--        <img src="@ui/assets/rectangular.svg" alt="" />-->
      <!--        Use previous-->
      <!--      </app-button>-->
    </template>
  </template>
</template>

<script>
import { Modes } from '@common/types/modes'
import { Actions } from '@common/types/actions'
import { postPluginMessage } from '@ui/utils/post-plugin-message'
import MenuButton from '@ui/components/menu-button.vue'
import LassoInstruction from '@ui/components/lasso-instruction.vue'
import HelpInfo from '@ui/components/help-info.vue'
import CommonTooltip from '@ui/components/common-tooltip.vue'
import CommonButton from '@ui/components/common-button.vue'

export default {
  name: 'App',
  components: {
    HelpInfo,
    MenuButton,
    LassoInstruction,
    CommonTooltip,
    CommonButton,
  },
  data() {
    return {
      mode: null,
      isShowActions: false,
      isActiveSelection: false,
      showHelpPopup: false,
      isActionRunning: false,
    }
  },
  computed: {
    modes: () => Modes,
    actions: () => Actions,
    isModeSelected() {
      return this.mode !== null
    },
  },
  mounted() {
    window.addEventListener('blur', this.start)
    window.addEventListener('message', this.handleMessages)
    window.addEventListener('keydown', this.handleKeyDown)
  },
  beforeUnmount() {
    window.removeEventListener('blur', this.start)
    window.removeEventListener('message', this.handleMessages)
    window.removeEventListener('keydown', this.handleKeyDown)
  },
  methods: {
    handleKeyDown(e) {
      if (e.key === 'Escape') {
        this.mode = null
      }
    },
    setMode(mode) {
      this.mode = mode
    },
    start() {
      if (this.mode === null) {
        return
      }
      postPluginMessage({
        action: Actions.START,
        details: { mode: this.mode },
      })
    },
    applyAction(action) {
      this.isActionRunning = true
      postPluginMessage({ action })
    },
    cancelAction() {
      postPluginMessage({
        action: Actions.ACTION_CANCEL,
      })
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
    openHelp() {
      this.showHelpPopup = true
    },
    closeHelp() {
      this.showHelpPopup = false
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

        case Actions.ACTION_FINISHED:
          this.isActionRunning = false
          break

        case Actions.SELECT_CHANGED:
          if (this.isShowActions) {
            this.isShowActions = false
          }
          break
      }
    },
  },
}
</script>

<style>
:root {
  --font-family: 'Inter';
  --padding: 12px;
}

.figma-dark {
  --img-invert: 1;
}

*,
*::before,
*::after {
  margin: 0;
  box-sizing: border-box;
}

body {
  background-color: var(--figma-color-bg);
  color: var(--figma-color-text);
  padding: 0;
  margin: 0;
  font-family: var(--font-family), sans-serif;
  font-size: 12px;
}

img {
  filter: invert(var(--img-invert, 0));
}

p {
  &:not(:last-child) {
    margin-bottom: 10px;
  }
}

a {
  color: var(--figma-color-text);

  &:hover {
    text-decoration: none;
  }
}
</style>

<style scoped>
.topbar {
  border-bottom: 1px solid var(--figma-color-border);
  padding: 0 var(--padding);
  height: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--figma-color-text-secondary);

  a {
    color: var(--figma-color-text-secondary);
  }
}

.loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-color: var(--figma-color-bg);
    opacity: 0.7;
    z-index: 1;
  }

  img {
    width: 30px;
    height: 30px;
    z-index: 1;
    margin-bottom: 30px;
  }

  button {
    z-index: 1;
  }
}
</style>
