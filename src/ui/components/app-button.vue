<template>
  <button type="button" class="button"><slot /></button>
</template>

<script>
export default {
  name: 'AppButton',
}
</script>

<style scoped>
.button {
  border: 2px solid black;
  border-radius: 10px;
  padding: 1rem;
}
</style>
