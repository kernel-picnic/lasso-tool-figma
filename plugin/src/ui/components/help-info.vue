<template>
  <div class="wrapper">
    <p>
      <close-button class="close-button" @click="$emit('close')" />

      If you have questions or found a bug, feel free to reach out.
    </p>
    <p>
      This plugin uses various tricks to improve results, though Figma’s
      complexity may affect outcomes. I aim to provide the best experience
      possible.
    </p>

    <common-button class="contact-button" @click="writeMessage">
      Contact with me
    </common-button>
  </div>
</template>

<script>
import CommonButton from '@ui/components/common-button.vue'
import CloseButton from '@ui/components/close-button.vue'

const HELP_LINK = 'mailto:hi@lasso.design'

export default {
  name: 'HelpInfo',
  components: { CloseButton, CommonButton },
  emits: ['close'],
  methods: {
    writeMessage() {
      window.open(HELP_LINK)
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

.contact-button {
  margin-top: auto;
  width: 100%;
}
</style>
