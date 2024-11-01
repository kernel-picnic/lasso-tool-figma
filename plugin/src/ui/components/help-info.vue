<template>
  <div class="wrapper">
    <p>
      <close-button class="close-button" @click="close" />

      If you have any questions about using this plugin or if you found a bug,
      please don't hesitate to reach out.
    </p>
    <p>
      This plugin uses a lot of hacks and tricks to achieve better result, but
      Figma has a complex structure. Nevertheless, my aim is to deliver good
      results for your experience.
    </p>

    <div class="buttons">
      <common-button @click="writeMessage">Contact me</common-button>
      <common-button @click="leaveFeedback">Send feedback</common-button>
    </div>
  </div>
</template>

<script>
import CommonButton from '@ui/components/common-button.vue'
import CloseButton from '@ui/components/close-button.vue'

const HELP_LINK = 'mailto:hi@lasso.design'

export default {
  name: 'HelpInfo',
  components: { CloseButton, CommonButton },
  emits: ['close', 'leave-feedback'],
  methods: {
    writeMessage() {
      window.open(HELP_LINK)
    },
    leaveFeedback() {
      this.$emit('leave-feedback')
      this.close()
    },
    close() {
      this.$emit('close')
    },
  },
}
</script>

<style scoped>
.wrapper {
  position: fixed;
  inset: 0;
  z-index: 1;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  background-color: var(--figma-color-bg);
  padding: var(--padding);
}

.close-button {
  float: right;
  margin: 0 0 10px 10px;
}

.buttons {
  margin-top: auto;
  width: 100%;
  display: flex;
  gap: 5px;

  & > * {
    width: 100%;
  }
}
</style>
