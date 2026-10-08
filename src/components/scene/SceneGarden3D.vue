<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import type { SceneEvent, SceneState } from '../../services/scene'
import type { GardenWorld } from './three/garden'

/** 页底 3D 花园：远山、湖泊、木屋、四季树木与小动物 */
const props = defineProps<{
  width: number
  height: number
  state: SceneState
  events: Partial<Record<SceneEvent, number>>
  active: boolean
  dark: boolean
}>()
const emit = defineEmits<{ failed: [] }>()

const GARDEN_EVENTS = ['birds', 'swallow', 'leaf', 'perch', 'rabbit', 'hedgehog', 'frog', 'squirrel', 'fish'] as const

const canvas = ref<HTMLCanvasElement | null>(null)
const world = shallowRef<GardenWorld | null>(null)
const ready = ref(false)
let disposed = false
let loading = false
let idleHandle = 0
let motionQuery: MediaQueryList | null = null

const stateKey = computed(() => {
  const s = props.state
  return [s.sky, s.phase, s.season, s.wind, s.warm, s.dayProgress === null ? '-' : s.dayProgress.toFixed(2), props.dark].join('|')
})

function onMotion(event: MediaQueryListEvent) { world.value?.setReducedMotion(event.matches) }

/** 首屏之后空闲时预载；滚到页底时若还没载好则立即加载 */
async function load() {
  if (loading || world.value || disposed) return
  loading = true
  try {
    const { createGardenWorld } = await import('./three/garden')
    if (disposed || !canvas.value) return
    const instance = createGardenWorld(canvas.value)
    world.value = instance
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery.addEventListener('change', onMotion)
    instance.setReducedMotion(motionQuery.matches)
    instance.resize(props.width, props.height)
    instance.setState(props.state, props.dark)
    instance.setActive(props.active)
    ready.value = true
  } catch (error) {
    console.warn('3D garden unavailable, falling back to 2D:', error)
    emit('failed')
  }
}

onMounted(() => {
  if (props.active) void load()
  else if (typeof window.requestIdleCallback === 'function') idleHandle = window.requestIdleCallback(() => void load(), { timeout: 5000 })
  else idleHandle = window.setTimeout(() => void load(), 3000)
})

watch(() => props.active, active => {
  if (active) void load()
  world.value?.setActive(active)
})
watch(() => [props.width, props.height], () => world.value?.resize(props.width, props.height))
watch(stateKey, () => world.value?.setState(props.state, props.dark))
for (const kind of GARDEN_EVENTS) {
  watch(() => props.events[kind], (token, previous) => { if (token && token !== previous) world.value?.fire(kind) })
}

onUnmounted(() => {
  disposed = true
  if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleHandle)
  window.clearTimeout(idleHandle)
  motionQuery?.removeEventListener('change', onMotion)
  world.value?.dispose()
  world.value = null
})
</script>

<template>
  <canvas ref="canvas" class="garden-canvas" :class="{ ready }" :style="{ width: width + 'px', height: height + 'px' }"></canvas>
</template>

<style scoped>
.garden-canvas {
  position: absolute;
  left: 0;
  bottom: 0;
  display: block;
  opacity: 0;
  transition: opacity 1s ease;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 44px);
  mask-image: linear-gradient(to bottom, transparent 0, #000 44px);
}
.garden-canvas.ready { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .garden-canvas { transition: none; } }
</style>
