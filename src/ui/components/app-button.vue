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
  background: none;
  display: flex;
  flex-direction: column;
  font-weight: 500;
  border: none;
  color: var(--figma-color-text);
  align-items: center;
  font-size: 14px;
  padding: 0;

  &:disabled {
    opacity: 0.6;
  }

  :global(img) {
    background-color: var(--figma-color-text);
    border-radius: 10px;
    padding: 5px;
    margin-bottom: 10px;
    width: 40px;
    height: 40px;
  }
}
</style>
