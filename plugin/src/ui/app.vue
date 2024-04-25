<template>
  <lasso-instruction v-if="isModeSelected" @cancel="cancel" />

  <!-- TODO: selection preview -->
  <!-- TODO: add help -->
  <!-- TODO: write that text nodes will be flatten in 'cut' mode -->
  <!-- TODO: optimize svgs -->
  <div
    v-else
    :class="['menu', { loading: typeof isLicenseActive === 'undefined' }]"
  >
    <template v-if="isShowActions">
      <menu-button @click="applyAction(actions.COPY)">
        <div class="icon"><img src="@ui/assets/copy.svg" alt="" /></div>
        Copy
      </menu-button>
      <menu-button @click="applyAction(actions.CUT)">
        <div class="icon"><img src="@ui/assets/cut.svg" alt="" /></div>
        Cut
      </menu-button>
      <menu-button disabled @click="prettify">
        <div class="icon"><img src="@ui/assets/prettify.svg" alt="" /></div>
        Prettify selection
        <!-- TODO -->
        <span class="available-soon">Soon</span>
      </menu-button>
    </template>

    <template v-else>
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
        <div class="tooltip" v-if="!isActiveSelection">
          ?
          <div class="tooltip-content">
            Choose any vector on&nbsp;the&nbsp;page to&nbsp;use&nbsp;it
            as&nbsp;a&nbsp;lasso
          </div>
        </div>
      </menu-button>
      <!-- TODO -->
      <!--      <app-button :disabled="true" @click="usePrevious">-->
      <!--        <img src="@ui/assets/rectangular.svg" alt="" />-->
      <!--        Use previous-->
      <!--      </app-button>-->
    </template>
  </div>

  <premium-info
    v-if="!isModeSelected"
    ref="premiumInfo"
    :is-license-active="isLicenseActive"
    :available-actions-count="availableActionsCount"
    @set-license-state="setLicenseActive"
  />
</template>

<script>
import { Modes } from '@common/types/modes'
import { Actions } from '@common/types/actions'
import MenuButton from '@ui/components/menu-button.vue'
import PremiumInfo from '@ui/components/premium-info.vue'
import LassoInstruction from '@ui/components/lasso-instruction.vue'
import { postPluginMessage } from './utils/post-plugin-message'

export default {
  name: 'App',
  components: {
    MenuButton,
    LassoInstruction,
    PremiumInfo,
  },
  data() {
    return {
      mode: null,
      isShowActions: false,
      isActiveSelection: false,
      showPremiumPopup: false,
      isLicenseActive: undefined,
      availableActionsCount: '-',
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
        details: { mode: this.mode },
      })
    },
    applyAction(action) {
      if (!this.isLicenseActive && !this.availableActionsCount) {
        postPluginMessage({
          action: Actions.NOTIFY,
          details: {
            message: 'Free actions is expired - get license key to continue',
            options: {
              error: true,
            },
          },
        })
        this.$refs.premiumInfo.popupShown = true
        return
      }
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

        case Actions.PASTE_ACTIONS_LIMIT:
          this.availableActionsCount = message.limit
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
  font-size: 12px;
}

img {
  filter: invert(var(--img-invert, 0));
}

a {
  color: var(--figma-color-text);

  &:hover {
    text-decoration: none;
  }
}

.tooltip {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--figma-color-bg-brand);
  border-radius: 50%;
  margin-left: auto;
  color: var(--figma-color-text-onbrand);
  position: relative;
  line-height: 1;
  font-size: 10px;
  font-weight: 500;
}

.tooltip:hover .tooltip-content {
  opacity: 1;
  transform: translateY(0);
}

.tooltip-content {
  opacity: 0;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease-in-out;
  transform: translateY(5px);
  pointer-events: none;
  background-color: var(--figma-color-bg-inverse);
  border-radius: 5px;
  padding: 8px 12px;
  position: absolute;
  inset: auto 0 calc(100% + 5px) auto;
  width: 140px;
  text-align: left;
  font-size: 12px;
  line-height: 1.4;
  color: var(--figma-color-text-oninverse);
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

  &.loading::before {
    content: '';
    position: absolute;
    inset: 0;
    background-color: var(--figma-color-bg);
    opacity: 0.7;
    z-index: 1;
  }
}
</style>
