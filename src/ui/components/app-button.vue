<template>
  <button :disabled="disabled" type="button" class="button">
    <slot />
  </button>
</template>

<script>
export default {
  name: 'AppButton',
  props: {
    disabled: {
      type: Boolean,
    },
  },
}
</script>

<style scoped>
.button {
  background: var(--figma-color-bg);
  color: var(--figma-color-text);
  display: flex;
  border: none;
  align-items: center;
  padding: 0 15px;
  width: 100%;
  height: 60px;
  font-size: 12px;
  font-family: var(--font-family), sans-serif;

  &:not(:last-child) {
    border-bottom: 1px solid var(--figma-color-border);
  }

  &:disabled {
    opacity: 0.6;
  }

  &:not(:disabled):hover {
    background-color: var(--figma-color-bg-hover);
  }

  &:global(.icon) {
    background-color: var(--figma-color-border);
    border-radius: 5px;
    padding: 2px;
    width: 30px;
    height: 30px;
    margin-right: 15px;
  }

  &:global(img) {
    width: 100%;
    height: 100%;
  }
}
</style>
