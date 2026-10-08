<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import type { SceneEvent, SceneState } from '../../services/scene'
import type { SunAnchor } from './geometry'
import type { SkyWorld } from './three/sky'

/** 页头 3D 天幕：太阳、月相、云、雨雪、风、雾、闪电、星空与流星 */
const props = defineProps<{
  width: number
  height: number
  sun: SunAnchor
  state: SceneState
  events: Partial<Record<SceneEvent, number>>
  active: boolean
  dark: boolean
}>()
const emit = defineEmits<{ ready: []; failed: [] }>()

const canvas = ref<HTMLCanvasElement | null>(null)
const world = shallowRef<SkyWorld | null>(null)
const ready = ref(false)
let disposed = false
let motionQuery: MediaQueryList | null = null

const body = computed(() => ({ x: props.sun.x, y: props.sun.top + (1 - props.state.altitude) * props.sun.travel, r: props.sun.r }))
const stateKey = computed(() => {
  const s = props.state
  return [s.sky, s.phase, s.season, s.wind, s.warm, s.moon.toFixed(2), props.dark].join('|')
})

function onMotion(event: MediaQueryListEvent) { world.value?.setReducedMotion(event.matches) }

onMounted(async () => {
  try {
    const { createSkyWorld } = await import('./three/sky')
    if (disposed || !canvas.value) return
    const instance = createSkyWorld(canvas.value)
    world.value = instance
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery.addEventListener('change', onMotion)
    instance.setReducedMotion(motionQuery.matches)
    instance.setLayout(props.width, props.height, body.value)
    instance.setState(props.state, props.dark)
    instance.setActive(props.active)
    ready.value = true
    emit('ready')
  } catch (error) {
    console.warn('3D sky unavailable, falling back to 2D:', error)
    emit('failed')
  }
})

watch(() => [props.width, props.height, body.value.x, Math.round(body.value.y), body.value.r], () => world.value?.setLayout(props.width, props.height, body.value))
watch(stateKey, () => world.value?.setState(props.state, props.dark))
watch(() => props.active, active => world.value?.setActive(active))
for (const kind of ['lightning', 'meteor'] as const) {
  watch(() => props.events[kind], (token, previous) => { if (token && token !== previous) world.value?.fire(kind) })
}

onUnmounted(() => {
  disposed = true
  motionQuery?.removeEventListener('change', onMotion)
  world.value?.dispose()
  world.value = null
})
</script>

<template>
  <canvas ref="canvas" class="sky-canvas" :class="{ ready }" :style="{ width: width + 'px', height: height + 'px' }"></canvas>
</template>

<style scoped>
.sky-canvas {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  opacity: 0;
  transition: opacity 1s ease;
  -webkit-mask-image: linear-gradient(to bottom, #000 0, #000 calc(100% - 130px), transparent 100%);
  mask-image: linear-gradient(to bottom, #000 0, #000 calc(100% - 130px), transparent 100%);
}
.sky-canvas.ready { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .sky-canvas { transition: none; } }
</style>
