<template>
  <div class="instruction">
    <div class="text">
      Click to any place on the page<br />
      to start selecting
    </div>
    <common-button class="button" @click="$emit('cancel')">
      Cancel
    </common-button>
  </div>
</template>

<script>
import CommonButton from '@ui/components/common-button.vue'

export default {
  name: 'LassoInstruction',
  components: { CommonButton },
  emits: ['cancel'],
}
</script>

<style scoped>
.instruction {
  text-align: center;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.text {
  height: 100%;
  display: flex;
  place-items: center;
  justify-content: center;
  padding: 10px;
  font-size: 12px;
  line-height: 1.5;
  border-bottom: 1px solid var(--figma-color-border);
}

.button {
  margin: 10px;
  width: calc(100% - 20px);
}
</style>
