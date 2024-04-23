<template>
  <div class="instruction">
    <div class="text">
      Click to any place on the page<br />
      to start selecting
    </div>
    <button type="button" class="button" @click="$emit('cancel')">
      Cancel
    </button>
  </div>
</template>

<script>
export default {
  name: 'LassoInstruction',
  emits: ['cancel'],
  mounted() {
    window.addEventListener('message', this.handleMessages)
  },
  beforeUnmount() {
    window.removeEventListener('message', this.handleMessages)
  },
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
  align-self: flex-end;
  font-family: var(--font-family), sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  height: 32px;
  max-height: 32px;
  font-size: 12px;
  color: var(--figma-color-text-oninverse);
  border-radius: 6px;
  border: none;
  width: calc(100% - 20px);
  margin: 10px;
  background-color: var(--figma-color-bg-inverse);
}
</style>
