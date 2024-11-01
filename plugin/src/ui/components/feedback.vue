<template>
  <div v-if="shown" class="feedback">
    <close-button class="close-button" @click="close" />
    <div v-if="!rate" class="title">Do you like this tool?</div>
    <template v-if="sent">
      <template v-if="isGoodRateSelected">
        <div class="subtitle">Thank you!</div>
        <div class="note">Please like or comment Lasso Tool</div>
        <div class="buttons">
          <common-button class="width-full" @click="openCommunity">
            Like
          </common-button>
          <common-button class="width-full" theme="outline" @click="close">
            Close
          </common-button>
        </div>
      </template>
      <template v-else>
        <div class="subtitle">Thank you</div>
        <div class="note">
          I'll carefully review your feedback and do my best to resolve it.
        </div>
        <common-button class="width-full" theme="outline" @click="close">
          Close
        </common-button>
      </template>
    </template>
    <template v-else>
      <div class="rate">
        <feedback-star
          v-for="i in [1, 2, 3, 4, 5]"
          :value="i"
          class="star"
          :class="{ active: i <= rate }"
          @click="setRate(i)"
        />
      </div>
      <div v-if="rate < 4">
        <div class="subtitle">
          I'm sorry to hear about your experience. Could you let me know how I
          can make it right?
        </div>
        <textarea
          v-model="message"
          class="message"
          rows="2"
          placeholder="Write your response"
        />
      </div>
      <common-button
        v-if="rate"
        :class="{ 'width-full': !isGoodRateSelected }"
        :loading="loading"
        @click="submit"
      >
        Submit
      </common-button>
    </template>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import FeedbackStar from '@ui/components/feedback-star.vue'
import CommonButton from '@ui/components/common-button.vue'
import CloseButton from '@ui/components/close-button.vue'
import { API_URL, DEFAULT_ACTIONS_LIMIT } from '@/constants'

const COMMUNITY_URL =
  'https://www.figma.com/community/plugin/1362438745920118538/lasso-tool'

export default defineComponent({
  components: { CloseButton, FeedbackStar, CommonButton },
  props: {
    availableActionsCount: {
      type: [String, Number],
      required: true,
    },
  },
  data() {
    return {
      shown: false,
      rate: undefined,
      message: '',
      loading: true,
      sent: false,
    }
  },
  computed: {
    isGoodRateSelected() {
      return this.rate >= 4
    },
  },
  mounted() {
    // Feedback was shown
    if (localStorage.getItem('feedback-shown') === '1') {
      return
    }
    if (
      !isNumber(this.availableActionsCount) ||
      this.availableActionsCount === DEFAULT_ACTIONS_LIMIT
    ) {
      return
    }
    this.shown = true
    localStorage.setItem('feedback-shown', '1')
  },
  methods: {
    setRate(value) {
      this.rate = value
    },
    submit() {
      this.loading = true
      fetch(`${API_URL}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          rate: this.rate,
          message: this.message,
        }),
      }).finally(() => {
        this.sent = true
        this.loading = false
      })
    },
    openCommunity() {
      window.open(COMMUNITY_URL)
      this.close()
    },
    close() {
      this.shown = false
    },
  },
})
</script>

<style lang="scss" scoped>
.feedback {
  position: absolute;
  inset: 0;
  padding: 0 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1;
  background-color: color-mix(in srgb, var(--figma-color-bg), 60% transparent);
  backdrop-filter: blur(10px);
  text-align: center;
}

.close-button {
  position: absolute;
  inset: 10px 10px auto auto;
}

.width-full {
  width: 100%;
}

.title {
  margin-bottom: 10px;
  letter-spacing: 0.2px;
}

.rate {
  &:not(:last-child) {
    margin-bottom: 20px;
  }
}

.star {
  padding: 0 3px;

  &.active,
  &:hover,
  &:has(~ .star:hover) {
    fill: var(--figma-color-bg-warning);
  }
}

.subtitle {
  margin-bottom: 10px;
  font-size: 1.1em;
  font-weight: 500;
}

.message {
  border-radius: 5px;
  background-color: var(--figma-color-bg);
  width: 100%;
  border: 1px solid var(--figma-color-border);
  margin-bottom: 10px;
  resize: none;
  padding: 5px 7px;
  font-family: var(--font-family), sans-serif;
  line-height: 1.4;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: var(--figma-color-bg-brand-hover);
  }
}

.note {
  line-height: 1.6;
  margin-bottom: 10px;
  text-wrap: balance;
}

.buttons {
  display: flex;
  gap: 5px;
  width: 100%;
}
</style>
