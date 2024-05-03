<template>
  <common-button class="close-button" theme="outline">
    <img src="@ui/assets/close.svg" alt="" />
  </common-button>
</template>

<script>
import CommonButton from '@ui/components/common-button.vue'

export default {
  name: 'CloseButton',
  components: { CommonButton },
}
</script>

<style scoped>
.close-button {
  width: 20px;
  height: 20px;
  padding: 5px;

  img {
    width: 100%;
    height: 100%;
  }
}
</style>
