<template>
  <button :disabled="disabled" type="button" class="button">
    <slot />
    <img src="@ui/assets/arrow-right.svg" class="arrow" alt="" />
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
  padding: 0 var(--padding);
  width: 100%;
  height: 60px;
  font-size: 12px;
  font-family: var(--font-family), sans-serif;

  &:not(:last-child) {
    border-bottom: 1px solid var(--figma-color-border);
  }

  &:disabled {
    color: var(--figma-color-text-disabled);

    &:global(.icon) {
      opacity: 0.6;
    }

    .arrow {
      display: none;
    }
  }

  &:not(:disabled):hover {
    cursor: pointer;
    background-color: var(--figma-color-bg-hover);
  }

  &:global(.icon) {
    background-color: var(--figma-color-border);
    border-radius: 5px;
    padding: 2px;
    width: 30px;
    height: 30px;
    margin-right: 12px;
  }

  &:global(.icon > img) {
    width: 100%;
    height: 100%;
  }
}

.arrow {
  margin-left: auto;
  width: 10px;
  height: 10px;
  opacity: 0.7;
}
</style>
