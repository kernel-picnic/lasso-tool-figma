<template>
  <div :class="['wrapper', { warning: !availableActionsCount }]">
    <template v-if="apiKey"> Subscription is active </template>
    <template v-else>
      {{ availableActionsCount }} uses remaining
      <a href="#" class="link" @click.prevent="showPopup">Get full access</a>
    </template>
  </div>

  <div v-if="popupShown" class="popup">
    <div class="header">
      <b class="heading">Unlock access</b>
      <common-button class="back-button" theme="outline" @click="hidePopup">
        <img src="@ui/assets/close.svg" alt="" />
      </common-button>
    </div>

    <div v-if="success" class="alert success" v-html="success" />
    <div v-else-if="error" class="alert error" v-html="error" />
    <div v-else class="text">
      Get full access with subscription. Cancel any time.
    </div>
    <form class="form">
      <input
        v-model="apiKey"
        type="text"
        class="input"
        placeholder="Enter license key"
      />
      <common-button
        theme="outline"
        :disabled="!apiKey"
        :loading="loading"
        @click="checkApiKey"
      >
        Check
      </common-button>
    </form>
    <common-button
      class="get-button"
      theme="primary"
      @click="openSubscriptionPage"
    >
      Get license key
    </common-button>
  </div>
</template>

<script>
import { API_URL } from '@/constants'
import { Actions } from '@common/types/actions'
import CommonButton from '@ui/components/common-button.vue'
import { postPluginMessage } from '@ui/utils/post-plugin-message'

const SUBSCRIPTION_URL = 'https://piqodesign.gumroad.com/l/localy'

export default {
  name: 'PremiumInfo',
  components: { CommonButton },
  emits: ['verified'],
  props: {
    availableActionsCount: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      apiKey: '',
      popupShown: false,
      success: null,
      error: null,
      loading: false,
    }
  },
  created() {
    window.addEventListener('message', this.handleMessages)
    postPluginMessage({ action: Actions.GET_API_KEY })
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
    checkApiKey() {
      this.success = null
      this.error = null
      this.loading = true

      fetch(`${API_URL}/verify-license-key`, {
        method: 'POST',
        body: JSON.stringify({ apiKey: this.apiKey }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            this.success = 'License key is valid - all features unlocked'
            postPluginMessage({
              action: Actions.SET_API_KEY,
              details: { apiKey: this.apiKey },
            })
            this.$emit('verified')
            return
          }
          this.error = data.message
        })
        .catch(() => {
          this.error = 'Unknown error - please try again&nbsp;later'
        })
        .finally(() => (this.loading = false))
    },
    handleMessages({ data }) {
      const message = data.pluginMessage

      switch (message.action) {
        case Actions.PASTE_API_KEY:
          this.apiKey = message.apiKey
          this.checkApiKey()
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
  padding: 0 15px;
  line-height: 1;

  &.warning {
    background-color: var(--figma-color-bg-warning-tertiary);
  }
}

.popup {
  position: fixed;
  inset: 0;
  background-color: var(--figma-color-bg);
  padding: 15px;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.back-button {
  width: 20px;
  height: 20px;
  padding: 5px;

  img {
    width: 100%;
    height: 100%;
  }
}

.heading {
  font-size: 14px;
  line-height: 20px;
}

.alert {
  padding: 8px 12px;
  border-radius: 6px;
  line-height: 1.4;
  margin-bottom: auto;

  &.error {
    background-color: var(--figma-color-bg-danger-secondary);
    color: var(--figma-color-text-ondanger);
  }

  &.success {
    background-color: var(--figma-color-bg-success-secondary);
    color: var(--figma-color-text-onsuccess);
  }
}

.text {
  margin-bottom: auto;
  line-height: 1.4;
}

.form {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.input {
  padding: 8px 12px;
  height: 32px;
  max-height: 32px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid var(--figma-color-border);
  font-family: var(--font-family), sans-serif;
  width: 100%;
}

.get-button {
  width: 100%;
}
</style>
