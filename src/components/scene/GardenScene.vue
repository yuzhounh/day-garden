<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, shallowRef } from 'vue'
import type { WeatherDay } from '../../types'
import { useCurrentTime } from '../../services/day'
import {
  deriveScene,
  sceneEventsFor,
  SCENE_EVENT_DURATION,
  SKY_EVENTS,
  type DayPhase,
  type SceneEvent,
  type SceneState,
  type Season,
  type SkyKind,
} from '../../services/scene'
import { sunAnchor, type Box, type SceneLayout } from './geometry'
import SceneSky from './SceneSky.vue'
import SceneGarden from './SceneGarden.vue'
import SceneSky3D from './SceneSky3D.vue'
import SceneGarden3D from './SceneGarden3D.vue'

/**
 * 天气画卷：天在上，地在下，日子在中间。
 * 页头是天幕，只放天象与气象（日月星辰、云、风、雨、雷电、雪、雾）；
 * 页底是花园，只放花草树木与飞禽走兽；中间的卡片区不加任何装饰。
 */
const props = defineProps<{ weather: WeatherDay | null; lat: number }>()

const SKY_KINDS: SkyKind[] = ['clear', 'partly', 'overcast', 'fog', 'drizzle', 'rain', 'storm', 'snow']
const PHASES: DayPhase[] = ['dawn', 'day', 'dusk', 'night']
const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

/** 预览用：?scene=rain,night,winter,wind2 可以直接查看某种天气画面；加上 2d 则强制使用 2D 版本 */
const sceneParam = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('scene')
const force2d = Boolean(sceneParam?.split(/[,\s]+/).includes('2d'))

/** WebGL 可用时用 3D 画卷，否则（或加载失败时）回退到 2D */
function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function readPreview(): Partial<SceneState> | null {
  const raw = sceneParam
  if (!raw) return null
  const preview: Partial<SceneState> = {}
  for (const token of raw.split(/[,\s]+/)) {
    if ((SKY_KINDS as string[]).includes(token)) preview.sky = token as SkyKind
    else if ((PHASES as string[]).includes(token)) preview.phase = token as DayPhase
    else if ((SEASONS as string[]).includes(token)) preview.season = token as Season
    else if (/^wind[0-2]$/.test(token)) preview.wind = Number(token.slice(4)) as 0 | 1 | 2
    else if (token === 'warm') preview.warm = true
  }
  if (preview.phase) {
    preview.altitude = preview.phase === 'day' || preview.phase === 'night' ? 0.85 : 0.15
    preview.dayProgress = { dawn: 0.04, day: 0.42, dusk: 0.96, night: null }[preview.phase]
  }
  return preview
}
const preview = readPreview()

const now = useCurrentTime()
const state = computed<SceneState>(() => ({ ...deriveScene(now.value, props.weather, props.lat), ...preview }))

const host = ref<HTMLElement | null>(null)
const skySentinel = ref<HTMLElement | null>(null)
const groundSentinel = ref<HTMLElement | null>(null)
const layout = shallowRef<SceneLayout | null>(null)
const sun = computed(() => (layout.value ? sunAnchor(layout.value) : null))
/** 天幕一直铺到卡片区上沿再往下 40px，最后 130px 渐隐 */
const skyHeight = computed(() => (layout.value ? Math.round(layout.value.contentTop + 40) : 0))
const gardenHeight = computed(() => layout.value?.gardenHeight ?? 0)

const events = reactive<Partial<Record<SceneEvent, number>>>({})
const webgl = !force2d && typeof document !== 'undefined' && supportsWebGL()
const sky3d = ref<'loading' | 'ready' | 'failed'>(webgl ? 'loading' : 'failed')
const garden3d = ref<'on' | 'failed'>(webgl ? 'on' : 'failed')
const dark = ref(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
let themeObserver: MutationObserver | undefined
const skyVisible = ref(true)
const groundVisible = ref(false)
const reducedMotion = ref(false)

function measure(): SceneLayout | null {
  const el = host.value
  const app = el?.parentElement
  if (!el || !app) return null
  const shell = app.querySelector('.garden-shell')
  const hero = app.querySelector('.hero-intro')
  if (!shell || !hero) return null
  const base = el.getBoundingClientRect()
  const rel = (r: DOMRect): Box => ({ x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height })
  const shellBox = rel(shell.getBoundingClientRect())
  let textRight = shellBox.x
  const range = document.createRange()
  for (const node of hero.querySelectorAll('.hero-copy > *')) {
    range.selectNodeContents(node)
    for (const rect of range.getClientRects()) textRight = Math.max(textRight, rect.right - base.left)
  }
  const date = hero.querySelector('.date-card')
  const main = shell.querySelector('main')
  const heroBox = rel(hero.getBoundingClientRect())
  // 花园高度取自 .garden-app 的底部留白（样式表是唯一来源），再多占 16px 与页脚衔接
  const gardenHeight = Math.round(parseFloat(getComputedStyle(app).paddingBottom) || 0) + 16
  return {
    width: base.width,
    height: base.height,
    shellLeft: shellBox.x,
    shellRight: shellBox.x + shellBox.w,
    hero: heroBox,
    textRight,
    dateCard: date ? rel(date.getBoundingClientRect()) : null,
    contentTop: main ? rel(main.getBoundingClientRect()).y : heroBox.y + heroBox.h,
    gardenHeight,
  }
}

function signature(l: SceneLayout | null): string {
  if (!l) return ''
  const boxes = [l.hero, l.dateCard].map(b => (b ? `${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.w)},${Math.round(b.h)}` : '-'))
  return [...[l.width, l.height, l.shellLeft, l.shellRight, l.textRight, l.contentTop, l.gardenHeight].map(Math.round), ...boxes].join('|')
}

let frame = 0
let resizeObserver: ResizeObserver | undefined
let textObserver: MutationObserver | undefined
let visibilityObserver: IntersectionObserver | undefined
let motionQuery: MediaQueryList | undefined

function schedule() {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    const next = measure()
    if (next && signature(next) !== signature(layout.value)) layout.value = next
  })
}

let eventTimer = 0
const clearTimers = new Map<SceneEvent, number>()
function fire(kind: SceneEvent) {
  events[kind] = (events[kind] ?? 0) + 1
  window.clearTimeout(clearTimers.get(kind))
  clearTimers.set(kind, window.setTimeout(() => { delete events[kind] }, SCENE_EVENT_DURATION[kind]))
}
function queueEvent(delay: number) {
  eventTimer = window.setTimeout(() => {
    if (!document.hidden && !reducedMotion.value) {
      const candidates = sceneEventsFor(state.value).filter(kind => (SKY_EVENTS.has(kind) ? skyVisible.value : groundVisible.value))
      const kind = candidates[Math.floor(Math.random() * candidates.length)]
      if (kind) fire(kind)
    }
    const storm = state.value.sky === 'storm'
    queueEvent(preview ? 5000 + Math.random() * 3000 : storm ? 9000 + Math.random() * 9000 : 20000 + Math.random() * 20000)
  }, delay)
}

function onMotionChange(event: MediaQueryListEvent) { reducedMotion.value = event.matches }

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = motionQuery.matches
  motionQuery.addEventListener('change', onMotionChange)

  // 页面尺寸与页头（问候语、日期卡片）决定天幕和花园的位置；问候语随时段换字时重新量一次
  const app = host.value?.parentElement
  resizeObserver = new ResizeObserver(schedule)
  for (const node of [app, app?.querySelector('.hero-intro'), app?.querySelector('.date-card')]) if (node) resizeObserver.observe(node)
  const copy = app?.querySelector('.hero-copy')
  if (copy) {
    textObserver = new MutationObserver(schedule)
    textObserver.observe(copy, { characterData: true, childList: true, subtree: true })
  }
  if ('IntersectionObserver' in window) {
    visibilityObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === skySentinel.value) skyVisible.value = entry.isIntersecting
        if (entry.target === groundSentinel.value) groundVisible.value = entry.isIntersecting
      }
    })
    if (skySentinel.value) visibilityObserver.observe(skySentinel.value)
    if (groundSentinel.value) visibilityObserver.observe(groundSentinel.value)
  } else {
    groundVisible.value = true
  }
  themeObserver = new MutationObserver(() => { dark.value = document.documentElement.classList.contains('dark') })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  void document.fonts?.ready.then(schedule)
  schedule()
  queueEvent(preview ? 2500 : 8000)
  // 预览模式下提供一个调试入口，便于逐帧检查动画：window.__gardenScene.fire('squirrel')
  if (preview) (window as unknown as { __gardenScene?: unknown }).__gardenScene = { fire }
})

onUnmounted(() => {
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  textObserver?.disconnect()
  themeObserver?.disconnect()
  visibilityObserver?.disconnect()
  motionQuery?.removeEventListener('change', onMotionChange)
  window.clearTimeout(eventTimer)
  for (const timer of clearTimers.values()) window.clearTimeout(timer)
})
</script>

<template>
  <div ref="host" class="garden-scene" :class="{ 'is-reduced': reducedMotion }" aria-hidden="true">
    <template v-if="layout && sun">
      <SceneSky :width="layout.width" :height="skyHeight" :sun="sun" :state="state" :events="events" :active="skyVisible" :tint-only="sky3d !== 'failed'" />
      <SceneSky3D
        v-if="sky3d !== 'failed'"
        :width="layout.width"
        :height="skyHeight"
        :sun="sun"
        :state="state"
        :events="events"
        :active="skyVisible"
        :dark="dark"
        @ready="sky3d = 'ready'"
        @failed="sky3d = 'failed'"
      />
      <template v-if="gardenHeight > 60">
        <SceneGarden3D
          v-if="garden3d === 'on'"
          :width="layout.width"
          :height="gardenHeight"
          :state="state"
          :events="events"
          :active="groundVisible"
          :dark="dark"
          @failed="garden3d = 'failed'"
        />
        <SceneGarden v-else :width="layout.width" :height="gardenHeight" :state="state" :events="events" :active="groundVisible" />
      </template>
    </template>
    <div ref="skySentinel" class="scene-sentinel" :style="{ top: 0, height: Math.max(skyHeight, 1) + 'px' }"></div>
    <div ref="groundSentinel" class="scene-sentinel" :style="{ bottom: 0, height: Math.max(gardenHeight, 1) + 'px' }"></div>
  </div>
</template>

<style scoped>
.garden-scene {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  contain: layout paint;
}
.scene-sentinel { position: absolute; left: 0; width: 1px; visibility: hidden; }
@media print { .garden-scene { display: none; } }
</style>
