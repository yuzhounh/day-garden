<script setup lang="ts">
import { ref, onMounted, onUnmounted, onErrorCaptured } from 'vue'
defineProps<{ title: string }>()
const host = ref<HTMLElement | null>(null)
const ready = ref(false)
const error = ref(false)
let observer: IntersectionObserver | undefined
onMounted(() => {
  if (!('IntersectionObserver' in window)) { ready.value = true; return }
  observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { ready.value = true; observer?.disconnect() }
  }, { rootMargin: '200px' })
  if (host.value) observer.observe(host.value)
})
onUnmounted(() => observer?.disconnect())
onErrorCaptured(() => { error.value = true; return false })
function reload() { window.location.reload() }
</script>

<template>
  <div ref="host" class="lazy-card">
    <div v-if="error" class="glass-panel lazy-card-placeholder" role="alert">{{ title }}加载失败。<button class="soft-button" @click="reload">重新打开页面</button></div>
    <Suspense v-else-if="ready">
      <slot />
      <template #fallback><div class="glass-panel lazy-card-placeholder" role="status">正在打开{{ title }}…</div></template>
    </Suspense>
    <div v-else class="glass-panel lazy-card-placeholder" :aria-label="title">{{ title }}</div>
  </div>
</template>

<style scoped>
.lazy-card { display: flex; flex-direction: column; min-width: 0; }
.lazy-card-placeholder { min-height: 260px; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 24px; color: var(--text-secondary, #66746b); }
</style>
