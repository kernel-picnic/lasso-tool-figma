<template>
  <button
    type="button"
    :disabled="loading"
    :class="['button', theme, { loading }]"
  >
    <img v-if="loading" src="@ui/assets/loader.svg" class="loader" alt="" />
    <slot v-else />
  </button>
</template>

<script>
export default {
  name: 'CommonButton',
  props: {
    theme: {
      type: String,
      default: 'default',
    },
    loading: {
      type: Boolean,
    },
  },
}
</script>

<style scoped>
.button {
  align-self: flex-end;
  font-family: var(--font-family), sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px var(--padding);
  height: 32px;
  max-height: 32px;
  font-size: 12px;
  border-radius: 6px;
  border: none;
  background: none;
  cursor: pointer;

  &.loading {
    opacity: 0.6;
  }

  &.default {
    color: var(--figma-color-text-oninverse);
    background-color: var(--figma-color-bg-inverse);
  }

  &.primary {
    color: var(--figma-color-text-onbrand);
    background-color: var(--figma-color-bg-brand);
  }

  &.outline {
    border: 1px solid
      color-mix(in srgb, var(--figma-color-bg-inverse), transparent 50%);
    color: var(--figma-color-bg-inverse);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.loader {
  width: 15px;
  height: 15px;
}
</style>
