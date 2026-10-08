<script setup lang="ts">
import { computed, useId } from 'vue'
import type { SceneEvent, SceneState, SkyKind } from '../../services/scene'
import { seeded, type SunAnchor } from './geometry'

const props = defineProps<{
  width: number
  height: number
  sun: SunAnchor
  state: SceneState
  events: Partial<Record<SceneEvent, number>>
  active: boolean
  /** 只画天空底色（3D 天幕负责其余天象） */
  tintOnly?: boolean
}>()

const uid = useId()
const url = (name: string) => `url(#${uid}-${name})`

const CLOUD_PATHS = [
  'M14 46C5 46 1 38 6 32C3 23 12 17 21 20C24 9 38 4 49 11C55 3 72 2 79 13C89 9 102 15 102 26C112 27 118 35 114 42C112 45 108 46 104 46Z',
  'M10 46C3 46 0 40 4 35C2 28 9 24 16 26C18 17 29 13 37 18C43 8 60 7 67 16C74 10 88 12 91 22C99 20 107 25 107 32C115 33 119 39 116 44C115 45.5 113 46 110 46Z',
  'M6 30C20 26 34 27 48 25C62 23 80 22 96 24C106 25 114 27 116 29C110 31 96 31 82 32C64 33 44 33 28 33C16 33 8 32 6 30Z',
]

const CLOUD_PLAN: Record<SkyKind, { n: number; shade: 0 | 1 | 2; size: [number, number]; opacity: number; wisp?: boolean }> = {
  clear: { n: 2, shade: 0, size: [130, 190], opacity: 0.75, wisp: true },
  partly: { n: 3, shade: 0, size: [110, 190], opacity: 0.92 },
  overcast: { n: 6, shade: 1, size: [150, 260], opacity: 0.9 },
  fog: { n: 2, shade: 1, size: [180, 260], opacity: 0.45 },
  drizzle: { n: 5, shade: 1, size: [150, 240], opacity: 0.9 },
  rain: { n: 6, shade: 2, size: [160, 270], opacity: 0.9 },
  storm: { n: 7, shade: 2, size: [180, 300], opacity: 0.95 },
  snow: { n: 5, shade: 1, size: [150, 240], opacity: 0.85 },
}

function tile(size: number, body: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>${body}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
function rainTile(size: number, count: number, len: [number, number], seed: number): string {
  const rand = seeded(seed)
  let lines = ''
  for (let i = 0; i < count; i++) {
    const l = len[0] + rand() * (len[1] - len[0])
    const x = 6 + rand() * (size - 12)
    const y = rand() * (size - l - 2)
    lines += `<line x1='${x.toFixed(1)}' y1='${y.toFixed(1)}' x2='${(x - l * 0.2).toFixed(1)}' y2='${(y + l).toFixed(1)}'/>`
  }
  return tile(size, `<g stroke='black' stroke-width='1.2' stroke-linecap='round'>${lines}</g>`)
}
function snowTile(size: number, count: number, radius: [number, number], seed: number): string {
  const rand = seeded(seed)
  let dots = ''
  for (let i = 0; i < count; i++) {
    const r = radius[0] + rand() * (radius[1] - radius[0])
    dots += `<circle cx='${(r + rand() * (size - 2 * r)).toFixed(1)}' cy='${(r + rand() * (size - 2 * r)).toFixed(1)}' r='${r.toFixed(1)}'/>`
  }
  return tile(size, dots)
}
const RAIN_FAR = { mask: rainTile(160, 16, [8, 14], 11), size: 160 }
const RAIN_NEAR = { mask: rainTile(200, 9, [16, 26], 23), size: 200 }
const SNOW_FAR = { mask: snowTile(180, 18, [0.9, 1.6], 31), size: 180 }
const SNOW_NEAR = { mask: snowTile(240, 12, [1.8, 2.8], 47), size: 240 }

const s = computed(() => props.state)
const night = computed(() => s.value.phase === 'night')
const narrow = computed(() => props.width < 600)
const body = computed(() => ({
  x: props.sun.x,
  y: props.sun.top + (1 - s.value.altitude) * props.sun.travel,
  r: props.sun.r,
}))

const sunMode = computed<'bright' | 'veiled' | 'hazy' | null>(() => {
  if (night.value) return null
  const sky = s.value.sky
  return sky === 'clear' ? 'bright' : sky === 'partly' ? 'veiled' : sky === 'overcast' || sky === 'fog' || sky === 'snow' ? 'hazy' : null
})
const moonMode = computed<'bright' | 'hazy' | null>(() => {
  if (!night.value) return null
  const sky = s.value.sky
  return sky === 'clear' || sky === 'partly' ? 'bright' : sky === 'overcast' || sky === 'fog' || sky === 'snow' ? 'hazy' : null
})
const moonR = computed(() => Math.round(props.sun.r * 0.82))

/** 亮面：外侧半圆 + 明暗交界的半椭圆（北半球，上弦亮右、下弦亮左） */
const moonLit = computed(() => {
  const r = moonR.value
  const q = Math.min(0.97, Math.max(0.03, s.value.moon))
  const rx = Math.abs(Math.cos(2 * Math.PI * q)) * r
  const waxing = q < 0.5
  const limb = waxing ? 1 : 0
  const term = waxing ? (q < 0.25 ? 0 : 1) : q < 0.75 ? 0 : 1
  return `M0 ${-r}A${r} ${r} 0 0 ${limb} 0 ${r}A${rx.toFixed(2)} ${r} 0 0 ${term} 0 ${-r}Z`
})

const tint = computed(() => {
  const layers: string[] = []
  const { x, y, r } = body.value
  if (sunMode.value === 'bright' || sunMode.value === 'veiled') layers.push(`radial-gradient(circle at ${x}px ${y}px, var(--sun-halo) 0, transparent ${r * 7}px)`)
  if (moonMode.value === 'bright') layers.push(`radial-gradient(circle at ${x}px ${y}px, var(--moon-halo-tint) 0, transparent ${r * 5}px)`)
  const weather: Partial<Record<SkyKind, string>> = {
    overcast: 'var(--tint-grey)', fog: 'var(--tint-fog)', drizzle: 'var(--tint-grey)',
    rain: 'var(--tint-rain)', storm: 'var(--tint-storm)', snow: 'var(--tint-snow)',
  }
  const w = weather[s.value.sky]
  if (w) layers.push(`linear-gradient(to bottom, ${w}, transparent 92%)`)
  if (s.value.phase !== 'day') layers.push(`linear-gradient(to bottom, var(--tint-${s.value.phase}), transparent 94%)`)
  return layers.join(', ') || 'none'
})

const clouds = computed(() => {
  const plan = CLOUD_PLAN[s.value.sky]
  const rand = seeded(plan.n * 7 + plan.shade * 31 + (plan.wisp ? 5 : 3))
  const speed = [1, 0.6, 0.35][s.value.wind]!
  const n = narrow.value ? Math.max(1, Math.ceil(plan.n * 0.6)) : plan.n
  const scale = narrow.value ? 0.68 : 1
  return Array.from({ length: n }, (_, i) => {
    const w = (plan.size[0] + rand() * (plan.size[1] - plan.size[0])) * scale
    const dur = (110 + rand() * 80) * speed
    const y = 4 + rand() * Math.max(16, props.height * 0.4 - w * 0.18)
    return {
      w,
      h: w * 0.42,
      y,
      dur,
      delay: -((i + rand() * 0.6) / n) * dur,
      rest: ((i + 0.5) / n) * props.width - w / 2,
      shade: plan.shade,
      shape: plan.wisp ? 2 : i % 2,
      opacity: plan.opacity * (0.78 + rand() * 0.22),
      flip: rand() > 0.5,
    }
  })
})

const fogBands = computed(() => (s.value.sky === 'fog' ? [0.22, 0.48, 0.72].map((t, i) => ({ top: props.height * t, h: 46 + i * 10, dur: 38 + i * 9 })) : []))

const windLines = computed(() => {
  if (s.value.wind === 0) return []
  const rand = seeded(61 + s.value.wind)
  const n = s.value.wind === 2 ? 5 : 3
  return Array.from({ length: n }, (_, i) => {
    const dur = (s.value.wind === 2 ? 4.5 : 7) + rand() * 2.5
    return { y: 24 + rand() * props.height * 0.55, w: 170 + rand() * 110, dur, delay: -((i + rand() * 0.5) / n) * dur }
  })
})

const precip = computed(() => {
  switch (s.value.sky) {
    case 'drizzle': return { kind: 'rain', layers: [{ ...RAIN_FAR, dur: 1.5, opacity: 0.6 }] }
    case 'rain': return { kind: 'rain', layers: [{ ...RAIN_FAR, dur: 1.0, opacity: 0.75 }, { ...RAIN_NEAR, dur: 0.72, opacity: 0.85 }] }
    case 'storm': return { kind: 'rain', layers: [{ ...RAIN_FAR, dur: 0.7, opacity: 0.85 }, { ...RAIN_NEAR, dur: 0.48, opacity: 0.95 }] }
    case 'snow': return { kind: 'snow', layers: [{ ...SNOW_FAR, dur: 15, opacity: 0.8 }, { ...SNOW_NEAR, dur: 9.5, opacity: 0.95 }] }
    default: return null
  }
})

const stars = computed(() => {
  if (!night.value || (s.value.sky !== 'clear' && s.value.sky !== 'partly')) return []
  const rand = seeded(97)
  const n = narrow.value ? 14 : 32
  return Array.from({ length: n }, (_, i) => ({
    x: rand() * props.width,
    y: 6 + rand() * props.height * 0.5,
    r: 0.6 + rand() * 0.9,
    twinkle: i % 3 === 0,
    delay: rand() * 6,
  }))
})

const pseudo = (token: number, salt: number) => ((token * 9301 + salt * 49297) % 233280) / 233280
const boltX = computed(() => 40 + pseudo(props.events.lightning ?? 1, 3) * Math.max(40, props.width - 120))
const meteor = computed(() => ({ x: props.width * (0.35 + pseudo(props.events.meteor ?? 1, 7) * 0.55), y: 10 + pseudo(props.events.meteor ?? 1, 11) * props.height * 0.25 }))
</script>

<template>
  <div
    class="scene-sky"
    :class="[`sky-${s.sky}`, `phase-${s.phase}`, { 'is-paused': !active }]"
    :style="{ height: height + 'px' }"
  >
    <svg class="sky-defs" width="0" height="0" aria-hidden="true">
      <defs>
        <radialGradient :id="`${uid}-sunglow`">
          <stop offset="0" style="stop-color: var(--sun-glow); stop-opacity: .6" />
          <stop offset=".45" style="stop-color: var(--sun-glow); stop-opacity: .2" />
          <stop offset="1" style="stop-color: var(--sun-glow); stop-opacity: 0" />
        </radialGradient>
        <radialGradient :id="`${uid}-suncore`" cx=".4" cy=".36" r=".7">
          <stop offset="0" style="stop-color: var(--sun-core-hi)" />
          <stop offset="1" style="stop-color: var(--sun-core)" />
        </radialGradient>
        <radialGradient :id="`${uid}-moonhalo`">
          <stop offset="0" style="stop-color: var(--moon-halo); stop-opacity: .5" />
          <stop offset="1" style="stop-color: var(--moon-halo); stop-opacity: 0" />
        </radialGradient>
        <linearGradient v-for="shade in [0, 1, 2]" :id="`${uid}-cloud${shade}`" :key="shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset=".1" :style="{ stopColor: `var(--cloud-${shade}-top)` }" />
          <stop offset="1" :style="{ stopColor: `var(--cloud-${shade}-bottom)` }" />
        </linearGradient>
      </defs>
    </svg>

    <div class="sky-tint" :style="{ backgroundImage: tint }"></div>

    <!-- 3D 天幕启用时，这里只保留底色与闪电亮光，其余天象由 WebGL 绘制 -->
    <template v-if="!tintOnly">
      <svg v-if="stars.length" class="sky-stars" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`">
        <circle
          v-for="(star, i) in stars"
          :key="i"
          :cx="star.x"
          :cy="star.y"
          :r="star.r"
          :class="{ twinkle: star.twinkle }"
          :style="{ animationDelay: `${star.delay}s` }"
        />
      </svg>

      <!-- 太阳：在问候语与日期卡片之间，随一天的时间缓缓升落 -->
      <div
        v-if="sunMode"
        class="sun"
        :class="`sun-${sunMode}`"
        :style="{ left: body.x - body.r * 3 + 'px', top: body.y - body.r * 3 + 'px', width: body.r * 6 + 'px', height: body.r * 6 + 'px' }"
      >
        <svg :viewBox="`${-body.r * 3} ${-body.r * 3} ${body.r * 6} ${body.r * 6}`">
          <circle class="sun-glow" :r="body.r * 2.9" :fill="url('sunglow')" />
          <circle class="sun-ring" :r="body.r * 1.5" />
          <circle class="sun-core" :r="body.r" :fill="url('suncore')" />
        </svg>
      </div>

      <!-- 月亮：按农历日画出真实月相 -->
      <div
        v-if="moonMode"
        class="moon"
        :class="`moon-${moonMode}`"
        :style="{ left: body.x - moonR * 3 + 'px', top: body.y - moonR * 3 + 'px', width: moonR * 6 + 'px', height: moonR * 6 + 'px' }"
      >
        <svg :viewBox="`${-moonR * 3} ${-moonR * 3} ${moonR * 6} ${moonR * 6}`">
          <circle class="moon-halo" :r="moonR * 2.7" :fill="url('moonhalo')" />
          <circle class="moon-disc" :r="moonR" />
          <path class="moon-lit" :d="moonLit" />
          <circle class="moon-crater" :cx="moonR * 0.28" :cy="-moonR * 0.22" :r="moonR * 0.17" />
          <circle class="moon-crater" :cx="-moonR * 0.18" :cy="moonR * 0.36" :r="moonR * 0.12" />
        </svg>
      </div>

      <div
        v-for="(c, i) in clouds"
        :key="`${s.sky}-${i}`"
        class="cloud"
        :style="{
          width: c.w + 'px',
          height: c.h + 'px',
          top: c.y + 'px',
          opacity: c.opacity,
          '--from': -c.w + 'px',
          '--to': width + 'px',
          '--rest': c.rest + 'px',
          animationDuration: c.dur + 's',
          animationDelay: c.delay + 's',
        }"
      >
        <svg viewBox="0 0 120 50" preserveAspectRatio="none">
          <path :d="CLOUD_PATHS[c.shape]" :fill="url(`cloud${c.shade}`)" :transform="c.flip ? 'matrix(-1 0 0 1 120 0)' : undefined" />
        </svg>
      </div>

      <!-- 多云：一朵云半遮着太阳 -->
      <div
        v-if="sunMode === 'veiled'"
        class="sun-veil"
        :style="{ left: body.x - body.r * 0.6 + 'px', top: body.y - body.r * 0.15 + 'px', width: body.r * 4.4 + 'px', height: body.r * 1.85 + 'px' }"
      >
        <svg viewBox="0 0 120 50" preserveAspectRatio="none"><path :d="CLOUD_PATHS[0]" :fill="url('cloud0')" /></svg>
      </div>

      <div
        v-for="(band, i) in fogBands"
        :key="'fog' + i"
        class="fog-band"
        :style="{ top: band.top + 'px', height: band.h + 'px', animationDuration: band.dur + 's', animationDelay: -i * 7 + 's' }"
      ></div>

      <div
        v-for="(line, i) in windLines"
        :key="'wind' + i"
        class="wind-line"
        :style="{ top: line.y + 'px', width: line.w + 'px', '--to': width + 'px', animationDuration: line.dur + 's', animationDelay: line.delay + 's' }"
      >
        <svg viewBox="0 0 240 24" preserveAspectRatio="none">
          <path d="M0 12C40 4 80 20 120 12S196 4 222 12c10 3 14-6 8-9-5-2-8 3-4 5" />
        </svg>
      </div>

      <div v-if="precip" class="precip" :class="`precip-${precip.kind}`">
        <div
          v-for="(layer, i) in precip.layers"
          :key="`${s.sky}-p${i}`"
          class="precip-sway"
          :style="{ animationDelay: -i * 2.3 + 's' }"
        >
          <div
            class="precip-layer"
            :style="{
              '--mask': layer.mask,
              '--tile': layer.size + 'px',
              opacity: layer.opacity,
              animationDuration: layer.dur + 's',
            }"
          ></div>
        </div>
      </div>
    </template>

    <template v-if="events.lightning">
      <div :key="'flash' + events.lightning" class="sky-flash"></div>
      <svg
        v-if="!tintOnly"
        :key="'bolt' + events.lightning"
        class="bolt"
        viewBox="0 0 40 120"
        :style="{ left: boltX + 'px', height: Math.min(130, height * 0.55) + 'px' }"
      >
        <path d="M25 0 11 54h11L8 120 34 44H21l9-44Z" />
      </svg>
    </template>

    <div v-if="events.meteor && !tintOnly" :key="'meteor' + events.meteor" class="meteor" :style="{ left: meteor.x + 'px', top: meteor.y + 'px' }"></div>
  </div>
</template>

<style scoped>
.scene-sky {
  --sun-core: #f7c768;
  --sun-core-hi: #ffeab0;
  --sun-glow: #ffd27a;
  --sun-halo: rgba(255, 216, 140, .30);
  --moon-lit: #f2d98c;
  --moon-edge: rgba(196, 160, 72, .55);
  --moon-disc: rgba(150, 160, 190, .24);
  --moon-halo: #dfe4ff;
  --moon-halo-tint: rgba(170, 182, 230, .22);
  --star: #8e9ac2;
  --cloud-0-top: #ffffff;
  --cloud-0-bottom: #e4eaf1;
  --cloud-1-top: #eef1f5;
  --cloud-1-bottom: #cfd6df;
  --cloud-2-top: #d3d9e1;
  --cloud-2-bottom: #a9b2be;
  --tint-grey: rgba(140, 150, 165, .16);
  --tint-fog: rgba(190, 198, 206, .28);
  --tint-rain: rgba(112, 128, 150, .22);
  --tint-storm: rgba(72, 82, 104, .30);
  --tint-snow: rgba(186, 202, 224, .26);
  --tint-night: rgba(66, 82, 146, .24);
  --tint-dawn: rgba(255, 196, 168, .26);
  --tint-dusk: rgba(255, 170, 120, .26);
  --rain-color: rgba(96, 118, 148, .55);
  --snow-color: #b9c7da;
  --fog-color: rgba(226, 231, 236, .75);
  --wind-color: rgba(110, 130, 150, .32);
  --flash-color: rgba(240, 244, 255, .85);
  --bolt-color: #fff6cf;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, #000 0, #000 calc(100% - 130px), transparent 100%);
  mask-image: linear-gradient(to bottom, #000 0, #000 calc(100% - 130px), transparent 100%);
}
.dark .scene-sky {
  --sun-core: #e9b75e;
  --sun-core-hi: #f8dc9c;
  --sun-glow: #e8b766;
  --sun-halo: rgba(232, 183, 102, .14);
  --moon-lit: #f3ead0;
  --moon-edge: rgba(255, 248, 220, .35);
  --moon-disc: rgba(120, 130, 160, .22);
  --moon-halo: #c9d2ff;
  --moon-halo-tint: rgba(150, 165, 230, .14);
  --star: #e9edf8;
  --cloud-0-top: #3d4450;
  --cloud-0-bottom: #2f3540;
  --cloud-1-top: #363c47;
  --cloud-1-bottom: #2a2f38;
  --cloud-2-top: #2c313a;
  --cloud-2-bottom: #20242b;
  --tint-grey: rgba(70, 80, 96, .22);
  --tint-fog: rgba(90, 98, 110, .26);
  --tint-rain: rgba(50, 62, 82, .32);
  --tint-storm: rgba(24, 30, 44, .45);
  --tint-snow: rgba(90, 104, 128, .24);
  --tint-night: rgba(28, 42, 96, .42);
  --tint-dawn: rgba(150, 96, 92, .22);
  --tint-dusk: rgba(160, 92, 64, .24);
  --rain-color: rgba(170, 190, 220, .42);
  --snow-color: #e6ecf5;
  --fog-color: rgba(80, 88, 100, .55);
  --wind-color: rgba(170, 186, 204, .26);
  --flash-color: rgba(190, 205, 255, .22);
  --bolt-color: #fff3c4;
}
.phase-dawn, .phase-dusk { --sun-core: #f4a565; --sun-core-hi: #ffd8a6; --sun-glow: #ffb07c; --sun-halo: rgba(255, 176, 124, .30); }

.sky-defs { position: absolute; width: 0; height: 0; }
.sky-tint, .sky-stars { position: absolute; inset: 0; }
.sky-tint { transition: background-image 1.2s ease; }
.sky-stars circle { fill: var(--star); opacity: .75; }
.sky-stars .twinkle { animation: star-twinkle 5s ease-in-out infinite; }

.sun, .moon, .sun-veil, .cloud, .fog-band, .wind-line, .meteor, .bolt { position: absolute; }
.sun svg, .moon svg, .cloud svg, .sun-veil svg, .wind-line svg { display: block; width: 100%; height: 100%; overflow: visible; }

.sun-glow { transform-box: fill-box; transform-origin: center; animation: sun-breathe 16s ease-in-out infinite alternate; }
.sun-ring { fill: none; stroke: var(--sun-core); stroke-width: 1; opacity: .22; transform-box: fill-box; transform-origin: center; animation: sun-ring 12s ease-in-out infinite alternate; }
.sun-hazy .sun-glow { opacity: .35; animation: none; }
.sun-hazy .sun-ring { display: none; }
.sun-hazy .sun-core { opacity: .5; }
.sky-snow .sun-hazy .sun-core { opacity: .38; }
.sun-veil { animation: veil-drift 22s ease-in-out infinite alternate; opacity: .95; }

.moon-disc { fill: var(--moon-disc); }
.moon-lit { fill: var(--moon-lit); stroke: var(--moon-edge); stroke-width: .7; stroke-linejoin: round; }
.moon-crater { fill: #b9b39a; opacity: .14; }
.moon-halo { animation: sun-breathe 18s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
.moon-hazy { opacity: .45; }

.cloud {
  left: 0;
  transform: translateX(var(--rest));
  animation-name: drift-across;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform;
}
.fog-band {
  left: -20%;
  width: 140%;
  background: radial-gradient(ellipse at center, var(--fog-color) 0, transparent 70%);
  animation: fog-drift ease-in-out infinite alternate;
}
.wind-line {
  left: 0;
  height: 18px;
  opacity: 0;
  animation-name: wind-across;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
.wind-line path { fill: none; stroke: var(--wind-color); stroke-width: 1.4; stroke-linecap: round; vector-effect: non-scaling-stroke; }

.precip { position: absolute; inset: 0; }
.precip-sway { position: absolute; inset: 0; }
.precip-snow .precip-sway { animation: snow-sway 6s ease-in-out infinite alternate; }
.precip-layer {
  position: absolute;
  left: -20px;
  right: -20px;
  top: calc(-1 * var(--tile));
  height: calc(100% + var(--tile));
  background: var(--rain-color);
  -webkit-mask-image: var(--mask);
  mask-image: var(--mask);
  -webkit-mask-size: var(--tile) var(--tile);
  mask-size: var(--tile) var(--tile);
  -webkit-mask-repeat: repeat;
  mask-repeat: repeat;
  animation: precip-fall linear infinite;
  will-change: transform;
}
.precip-snow .precip-layer { background: var(--snow-color); }

.sky-flash { position: absolute; inset: 0; background: var(--flash-color); opacity: 0; animation: flash .9s ease-out forwards; }
.bolt { top: 8px; width: auto; aspect-ratio: 1 / 3; opacity: 0; animation: flash .9s ease-out forwards; }
.bolt path { fill: var(--bolt-color); }

.meteor {
  width: 110px;
  height: 1.6px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(255, 255, 255, .95), rgba(255, 255, 255, 0));
  transform-origin: left center;
  opacity: 0;
  animation: meteor-fall 1.8s ease-out forwards;
}
html:not(.dark) .meteor { background: linear-gradient(90deg, rgba(120, 132, 180, .9), rgba(120, 132, 180, 0)); }

.is-paused, .is-paused * { animation-play-state: paused !important; }

@keyframes star-twinkle { 0%, 100% { opacity: .75; } 50% { opacity: .2; } }
@keyframes sun-breathe { from { transform: scale(.94); opacity: .82; } to { transform: scale(1.06); opacity: 1; } }
@keyframes sun-ring { from { transform: scale(.96); opacity: .12; } to { transform: scale(1.08); opacity: .28; } }
@keyframes veil-drift { from { transform: translateX(-6px); } to { transform: translateX(10px); } }
@keyframes drift-across { from { transform: translateX(var(--from)); } to { transform: translateX(var(--to)); } }
@keyframes fog-drift { from { transform: translateX(-4%); } to { transform: translateX(4%); } }
@keyframes wind-across {
  0% { transform: translateX(-300px); opacity: 0; }
  15% { opacity: 1; }
  80% { opacity: 1; }
  100% { transform: translateX(var(--to)); opacity: 0; }
}
@keyframes precip-fall { to { transform: translateY(var(--tile)); } }
@keyframes snow-sway { from { transform: translateX(-12px); } to { transform: translateX(12px); } }
@keyframes flash { 0% { opacity: 0; } 8% { opacity: 1; } 20% { opacity: .15; } 32% { opacity: .75; } 100% { opacity: 0; } }
@keyframes meteor-fall {
  0% { transform: rotate(-24deg) translateX(0); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: rotate(-24deg) translateX(-180px); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .scene-sky * { animation: none !important; }
  .wind-line, .sky-flash, .bolt, .meteor { display: none; }
}
</style>
