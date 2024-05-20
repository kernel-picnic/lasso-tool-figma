<template>
  <div v-if="!isModeSelected" class="topbar">
    <template v-if="isShowActions">Choose action</template>
    <template v-else>Choose tool</template>
    <a href="#" @click.prevent="openHelp">Help</a>
  </div>
  <help-info v-if="showHelpPopup" @close="closeHelp" />

  <lasso-instruction v-if="isModeSelected" @cancel="cancel" />

  <!-- TODO: selection preview -->
  <!-- TODO: add help -->
  <!-- TODO: write that text nodes will be flatten in 'cut' mode -->
  <div v-else :class="['menu', { disabled: isMenuDisabled }]">
    <div v-if="isOffline" class="no-internet">
      No internet connection
      <img src="@ui/assets/no-internet.svg" alt="" />
    </div>

    <div v-if="isActionRunning" class="loader">
      <!-- TODO: fix loader freeze -->
      <img src="@ui/assets/loader.svg" alt="" />
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
      <menu-button disabled @click="prettify">
        <div class="icon"><img src="@ui/assets/prettify.svg" alt="" /></div>
        Prettify selection
        <!-- TODO -->
        <span class="available-soon">Soon</span>
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
  </div>

  <license-info
    v-show="!isModeSelected"
    ref="licenseInfo"
    :is-license-active="isLicenseActive"
    :available-actions-count="availableActionsCount"
    @set-license-state="setLicenseActive"
  />
</template>

<script>
import { Modes } from '@common/types/modes'
import { Actions } from '@common/types/actions'
import { postPluginMessage } from '@ui/utils/post-plugin-message'
import MenuButton from '@ui/components/menu-button.vue'
import LicenseInfo from '@ui/components/license-info.vue'
import LassoInstruction from '@ui/components/lasso-instruction.vue'
import HelpInfo from '@ui/components/help-info.vue'
import CommonTooltip from '@ui/components/common-tooltip.vue'

export default {
  name: 'App',
  components: {
    HelpInfo,
    MenuButton,
    LassoInstruction,
    LicenseInfo,
    CommonTooltip,
  },
  data() {
    return {
      mode: null,
      isShowActions: false,
      isActiveSelection: false,
      showHelpPopup: false,
      showLicensePopup: false,
      isLicenseActive: true,
      isActionRunning: false,
      availableActionsCount: '-',
      isOffline: false,
    }
  },
  computed: {
    modes: () => Modes,
    actions: () => Actions,
    isModeSelected() {
      return this.mode !== null
    },
    isMenuDisabled() {
      return (
        (this.isShowActions && typeof this.isLicenseActive === 'undefined') ||
        this.isOffline
      )
    },
  },
  mounted() {
    window.addEventListener('blur', this.start)
    window.addEventListener('message', this.handleMessages)
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('online', this.checkInternet)
    window.addEventListener('offline', this.checkInternet)
  },
  beforeUnmount() {
    window.removeEventListener('blur', this.start)
    window.removeEventListener('message', this.handleMessages)
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('online', this.checkInternet)
    window.removeEventListener('offline', this.checkInternet)
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
      if (!this.isLicenseActive && !this.availableActionsCount) {
        postPluginMessage({
          action: Actions.NOTIFY,
          details: {
            message: 'No free actions left - get license key to continue',
            options: {
              error: true,
            },
          },
        })
        this.$refs.licenseInfo.popupShown = true
        return
      }
      this.isActionRunning = true
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
    setLicenseActive(value) {
      this.isLicenseActive = value
    },
    openHelp() {
      this.showHelpPopup = true
    },
    closeHelp() {
      this.showHelpPopup = false
    },
    checkInternet() {
      this.isOffline = !window.navigator.onLine
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

        case Actions.PASTE_ACTIONS_LIMIT:
          this.availableActionsCount = message.limit
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

.available-soon {
  background-color: var(--figma-color-bg-tertiary);
  padding: 3px 5px;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  border-radius: 4px;
  color: var(--figma-color-text);
  margin-left: auto;
  font-size: 10px;
  font-weight: 500;
}

.menu {
  position: relative;

  &.disabled::before {
    content: '';
    position: absolute;
    inset: 0;
    background-color: var(--figma-color-bg);
    opacity: 0.7;
    z-index: 1;
  }
}

.loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;

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
  }
}
</style>
