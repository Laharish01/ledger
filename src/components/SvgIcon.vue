<!--
  SvgIcon — renders an inline SVG string at a given size.
  Usage: <SvgIcon :svg="iconEdit" :size="16" />
-->
<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <span class="svg-icon" :style="{ width: size + 'px', height: size + 'px' }" v-html="svg" />
</template>

<script setup>
defineProps({
  svg:  { type: String, required: true },
  size: { type: Number, default: 16 },
})
</script>

<style scoped>
.svg-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Pass current color through to the SVG stroke */
.svg-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
