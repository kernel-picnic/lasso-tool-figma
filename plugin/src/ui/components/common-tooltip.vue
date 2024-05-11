<template>
  <div :class="['tooltip', theme]">
    <slot name="icon">?</slot>
    <div class="tooltip-content">
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  name: 'CommonTooltip',
  props: {
    theme: {
      type: String,
      default: 'info',
    },
  },
}
</script>

<style lang="scss" scoped>
.tooltip {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-left: auto;
  position: relative;
  line-height: 1;
  font-size: 10px;
  font-weight: 500;

  &.info {
    background-color: var(--figma-color-bg-brand);
    color: var(--figma-color-text-onbrand);
  }

  &.warning {
    border: 1px solid var(--figma-color-bg-component);
    color: var(--figma-color-bg-component);
  }
}

.tooltip:hover .tooltip-content {
  opacity: 1;
  transform: translateY(0);
}

:global(.tooltip + .arrow) {
  margin-left: 15px;
}

.tooltip-content {
  opacity: 0;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease-in-out;
  transform: translateY(5px);
  pointer-events: none;
  background-color: var(--figma-color-bg-inverse);
  border-radius: 5px;
  padding: 8px var(--padding);
  position: absolute;
  inset: auto 0 calc(100% + 5px) auto;
  width: 140px;
  text-align: left;
  font-size: 12px;
  line-height: 1.4;
  color: var(--figma-color-text-oninverse);
}
</style>
