<script setup lang="ts">
import logo from '../assets/logo.svg?raw'

withDefaults(defineProps<{ size?: number }>(), { size: 32 })
</script>

<template>
  <span class="brand-logo" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true" v-html="logo"></span>
</template>

<style scoped>
.brand-logo { display: inline-block; flex-shrink: 0; color: var(--accent); line-height: 0; }
.brand-logo :deep(svg) { display: block; width: 100%; height: 100%; color: inherit; }
</style>
