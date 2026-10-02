<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number | string
    strokeWidth?: number | string
  }>(),
  {
    size: 16,
    strokeWidth: 2,
  }
)
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="scent-icon"
    aria-hidden="true"
  >
    <!-- 侧面鼻梁与鼻尖轮廓 (嗅觉) -->
    <path d="M14 3.5c-.4 3.2-1.6 7.2-2.8 11.2a2.8 2.8 0 0 0 2.6 3.3h.6a2.6 2.6 0 0 0 2.6-2.4c0-1.1-.8-2.1-1.8-2.1" />
    <!-- 拂面而来的花香气息波纹 -->
    <path d="M6 6.5c1.4 1 1.4 2.5 0 3.5" />
    <path d="M3.5 11c1.6 1.1 1.6 2.7 0 3.8" />
    <path d="M5.5 15.5c1.4 1 1.4 2.5 0 3.5" />
  </svg>
</template>
