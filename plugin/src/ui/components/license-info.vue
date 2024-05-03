<template>
  <div>
    <div :class="wrapperClasses">
      <template v-if="loading">Loading...</template>
      <template v-else-if="isLicenseActive">
        License active
        <a href="#" class="link" @click.prevent="showPopup">Manage</a>
      </template>
      <template v-else>
        {{ availableActionsCount }} uses remaining
        <a href="#" class="link" @click.prevent="showPopup">Get full access</a>
      </template>
    </div>

    <div v-if="popupShown" class="popup">
      <div class="header">
        <b class="heading">Full access</b>
        <close-button @click="hidePopup" />
      </div>

      <template v-if="success">
        <div class="alert success" v-html="success" />
        <p class="note">
          If you want to use current license key for another account, click
          to&nbsp;"Detach"&nbsp;button
        </p>
      </template>
      <div v-else-if="error" class="alert error" v-html="error" />
      <div v-else class="text">
        Get license key to use Lasso Tool. Paid <b>once</b> - use unlimited.
      </div>
      <form class="form">
        <input
          v-model="licenseKey"
          type="text"
          class="input"
          placeholder="Enter license key"
          :disabled="isLicenseActive"
        />
        <common-button
          v-if="isLicenseActive"
          theme="outline"
          :disabled="!licenseKey"
          :loading="loading"
          @click="detach"
        >
          Detach
        </common-button>
        <common-button
          v-else
          theme="outline"
          :disabled="!licenseKey"
          :loading="loading"
          @click="checkLicenseKey"
        >
          Submit
        </common-button>
      </form>
      <common-button
        v-if="!isLicenseActive"
        class="get-button"
        theme="primary"
        @click="openSubscriptionPage"
      >
        Get a license key
      </common-button>
    </div>
  </div>
</template>

<script>
import { API_URL } from '@/constants'
import { postPluginMessage } from '@ui/utils/post-plugin-message'
import { Actions } from '@common/types/actions'
import CommonButton from '@ui/components/common-button.vue'
import CloseButton from '@ui/components/close-button.vue'

const SUBSCRIPTION_URL = 'https://troynin.gumroad.com/l/lasso-tool'

export default {
  name: 'PremiumInfo',
  components: { CloseButton, CommonButton },
  emits: ['set-license-state'],
  props: {
    availableActionsCount: {
      type: Number,
      required: true,
    },
    isLicenseActive: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      licenseKey: '',
      popupShown: false,
      success: null,
      error: null,
      loading: true,
    }
  },
  computed: {
    wrapperClasses() {
      let classes = ['wrapper']
      if (this.loading) {
        classes.push('loading')
      } else if (this.isLicenseActive) {
        classes.push('verified')
      } else if (!this.availableActionsCount) {
        classes.push('warning')
      }
      return classes
    },
    isFirstCheck() {
      return typeof this.isLicenseActive === 'undefined'
    },
  },
  created() {
    window.addEventListener('message', this.handleMessages)
    postPluginMessage({ action: Actions.GET_LICENSE_KEY })
    postPluginMessage({ action: Actions.GET_ACTIONS_LIMIT })
  },
  beforeUnmount() {
    window.removeEventListener('message', this.handleMessages)
  },
  methods: {
    showPopup() {
      this.popupShown = true
    },
    hidePopup() {
      this.popupShown = false
    },
    openSubscriptionPage() {
      window.open(SUBSCRIPTION_URL)
    },
    checkLicenseKey() {
      if (!this.isFirstCheck && this.loading) {
        return
      }

      this.success = null
      this.error = null
      this.loading = true

      fetch(`${API_URL}/verify-license-key`, {
        method: 'POST',
        body: JSON.stringify({
          licenseKey: this.licenseKey,
          incrementUsesCount: !this.isFirstCheck,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.success) {
            this.handleError(data.status)
            return
          }
          this.success =
            'License key is active - all features is available. Thank you! ❤️'
          postPluginMessage({
            action: Actions.STORE_LICENSE_KEY,
            details: {
              licenseKey: this.licenseKey,
            },
          })
          this.$emit('set-license-state', true)
        })
        .catch(this.handleError)
        .finally(() => (this.loading = false))
    },
    handleError(status = '') {
      this.$emit('set-license-state', false)
      switch (status) {
        case 'invalid_key':
          this.error = 'Invalid license key'
          break
        case 'already_in_use':
          this.error =
            'License key already used in another account - detach it before'
          break
        default:
          this.error = 'Unknown error - please try again&nbsp;later'
      }
    },
    detach() {
      if (this.loading) {
        return
      }

      this.loading = true

      fetch(`${API_URL}/detach-license-key`, {
        method: 'POST',
        body: JSON.stringify({ licenseKey: this.licenseKey }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.success) {
            this.handleError(data.status)
            return
          }
          this.success = null
          this.licenseKey = ''
          postPluginMessage({
            action: Actions.STORE_LICENSE_KEY,
            details: { licenseKey: '' },
          })
          this.$emit('set-license-state', false)
        })
        .catch(() => {
          this.error = 'Unknown error - please try again&nbsp;later'
        })
        .finally(() => (this.loading = false))
    },
    handleMessages({ data }) {
      const message = data.pluginMessage

      switch (message.action) {
        case Actions.PASTE_LICENSE_KEY:
          if (!message.licenseKey) {
            this.loading = false
            this.$emit('set-license-state', false)
            return
          }
          this.licenseKey = message.licenseKey
          this.checkLicenseKey()
          break
      }
    },
  },
}
</script>

<style scoped>
.wrapper {
  background-color: var(--figma-color-bg-brand-tertiary);
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--padding);
  line-height: 1;

  &.loading {
    background-color: var(--figma-color-bg-secondary);
  }

  &.verified {
    background-color: var(--figma-color-bg-success-tertiary);
  }

  &.warning {
    background-color: var(--figma-color-bg-warning-tertiary);
  }
}

.popup {
  position: fixed;
  inset: 0;
  background-color: var(--figma-color-bg);
  padding: var(--padding);
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.heading {
  font-size: 14px;
  line-height: 20px;
}

.alert {
  padding: 8px var(--padding);
  border-radius: 6px;
  line-height: 1.4;
  margin-bottom: 10px;
  color: var(--figma-color-text-hover);

  &.error {
    background-color: var(--figma-color-bg-danger-tertiary);
  }

  &.success {
    background-color: var(--figma-color-bg-success-tertiary);
  }
}

.text {
  line-height: 1.4;
}

.form {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: auto 0 0;

  &:not(:last-child) {
    margin-bottom: 10px;
  }
}

.input {
  padding: 8px var(--padding);
  height: 32px;
  max-height: 32px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid var(--figma-color-border);
  font-family: var(--font-family), sans-serif;
  width: 100%;

  &:disabled {
    background-color: var(--figma-color-disabled);
    color: var(--figma-color-text-onselected-secondary);
  }
}

.note {
  margin: 0;
  line-height: 1.5;
  opacity: 0.8;
}

.get-button {
  width: 100%;
}
</style>
