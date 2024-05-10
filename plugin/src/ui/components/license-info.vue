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

      <div v-if="errorText" class="alert error" v-html="errorText" />
      <template v-else-if="showSuccessAlert">
        <div class="alert success">
          License key is active - all features is available. Thank you! ❤️
        </div>
        <p class="note">
          If you want to use current license key for another account, click
          to&nbsp;"Deactivate"&nbsp;button
        </p>
      </template>
      <div v-else class="text">
        Get license key to use Lasso Tool.<br />
        Paid <b>once</b> - use unlimited.
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
          @click="deactivateKey"
        >
          Deactivate
        </common-button>
        <common-button
          v-else
          theme="outline"
          :disabled="!licenseKey"
          :loading="loading"
          @click="activateKey"
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

const SUBSCRIPTION_URL =
  'https://troynin.lemonsqueezy.com/buy/5aefaf66-240a-4b46-9be6-14d7041c08cc'

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
      popupShown: false,
      licenseKey: '',
      instanceId: '',
      userId: null,
      showSuccessAlert: false,
      errorText: '',
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
    postPluginMessage({ action: Actions.GET_LICENSE_INFO })
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
    sendRequest(url, payload) {
      if (!this.isFirstCheck && this.loading) {
        return Promise.resolve()
      }
      this.loading = true
      this.errorText = ''
      return fetch(`${API_URL}/${url}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .catch(
          () =>
            (this.errorText = 'Unknown error - please try again&nbsp;later'),
        )
        .finally(() => (this.loading = false))
    },
    validateKey() {
      this.sendRequest('license/validate', {
        licenseKey: this.licenseKey,
        instanceId: this.instanceId,
      }).then(({ success }) => {
        this.showSuccessAlert = true
        this.$emit('set-license-state', success)
      })
    },
    activateKey() {
      this.sendRequest('license/activate', {
        licenseKey: this.licenseKey,
        userId: this.userId,
      }).then((data) => {
        if (!data.success) {
          this.handleError(data.status)
          return
        }
        this.instanceId = data.instanceId
        this.showSuccessAlert = true
        postPluginMessage({
          action: Actions.SET_LICENSE_INFO,
          details: {
            licenseKey: this.licenseKey,
            instanceId: this.instanceId,
          },
        })
        this.$emit('set-license-state', true)
      })
    },
    deactivateKey() {
      this.sendRequest('license/deactivate', {
        licenseKey: this.licenseKey,
        instanceId: this.instanceId,
      }).then((data) => {
        if (!data.success) {
          this.handleError(data.status)
          return
        }
        this.licenseKey = ''
        this.instanceId = ''
        this.showSuccessAlert = false
        postPluginMessage({
          action: Actions.SET_LICENSE_INFO,
          details: { licenseKey: '', instanceId: '' },
        })
        this.$emit('set-license-state', false)
      })
    },
    handleError(status = '') {
      switch (status) {
        case 'invalid_key':
          this.errorText = 'Invalid license key'
          break
        case 'already_active':
          this.errorText =
            'License key already used in another account - deactivate it before'
          break
        default:
          this.errorText = 'Unknown error - please try again&nbsp;later'
      }
    },
    handleMessages({ data }) {
      const message = data.pluginMessage

      switch (message.action) {
        case Actions.PASTE_LICENSE_INFO:
          this.userId = message.userId
          if (!message.licenseKey) {
            this.loading = false
            this.$emit('set-license-state', false)
            return
          }
          this.licenseKey = message.licenseKey
          this.instanceId = message.instanceId
          this.validateKey()
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
  line-height: 1.5;
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
