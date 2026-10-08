<script setup lang="ts">
import { computed, useId } from 'vue'
import type { SceneEvent, SceneState, Season } from '../../services/scene'
import { OAK_PERCH, OAK_SIZE, PINE_SIZE, SAPLING_SCALE, gardenLayout, leafPath, seeded } from './geometry'

/**
 * 页底花园：花草树木与飞禽走兽都在这里。
 * 天气只以“痕迹”出现——水洼、积雪、脚印、被风吹斜的草木与飘飞的落叶。
 */
const props = defineProps<{
  width: number
  height: number
  state: SceneState
  events: Partial<Record<SceneEvent, number>>
  active: boolean
}>()

const uid = useId()
const g = computed(() => gardenLayout(props.width, props.height))
const s = computed(() => props.state)
const lit = computed(() => s.value.phase !== 'night')
const wet = computed(() => s.value.sky === 'drizzle' || s.value.sky === 'rain' || s.value.sky === 'storm')
const snowy = computed(() => s.value.sky === 'snow')
const season = computed(() => s.value.season)
const bare = computed(() => season.value === 'winter')
const sc = computed(() => g.value.scale)

const f1 = (v: number) => v.toFixed(1)
const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x) }
/** 地平线起伏；树根与栅栏处放平，让它们稳稳站在地上 */
function ridgeY(x: number): number {
  const { ridge, oak, sapling, pine, fence } = g.value
  const flat = Math.min(
    smooth(Math.abs(x - oak.x) / 60),
    sapling ? smooth(Math.abs(x - sapling.x) / 40) : 1,
    smooth(Math.abs(x - pine.x) / 40),
    smooth(Math.abs(x - (fence.x + fence.w / 2)) / (fence.w / 2 + 24)),
  )
  return ridge + (2.6 * Math.sin(x / 140) + 1.6 * Math.sin(x / 53 + 1)) * flat
}
function profile(fn: (x: number) => number, step = 24): string {
  let d = `M0 ${f1(fn(0))}`
  for (let x = step; x < props.width + step; x += step) d += `L${f1(Math.min(x, props.width))} ${f1(fn(Math.min(x, props.width)))}`
  return d
}

/** 远景两层缓坡，坡上疏疏几棵远树 */
const hillBackY = (x: number) => g.value.ridge - 36 + 8 * Math.sin(x / 310 + 1.2) + 5 * Math.sin(x / 131)
const hillMidY = (x: number) => g.value.ridge - 20 + 6 * Math.sin(x / 220 + 0.4) + 3 * Math.sin(x / 77)
const hillBack = computed(() => `${profile(hillBackY)}L${props.width} ${props.height}L0 ${props.height}Z`)
const hillMid = computed(() => `${profile(hillMidY)}L${props.width} ${props.height}L0 ${props.height}Z`)
const farTrees = computed(() => {
  const rand = seeded(5)
  const trees: string[] = []
  for (let x = 30 + rand() * 60; x < props.width - 10; x += (g.value.narrow ? 70 : 90) + rand() * 100) {
    const y = hillMidY(x) + 2
    const h = (12 + rand() * 9) * sc.value
    const trunk = `M${f1(x - 0.6)} ${f1(y)}h1.2v${f1(-h * 0.45)}h-1.2Z`
    trees.push(rand() > 0.45
      ? `${trunk}M${f1(x)} ${f1(y - h * 0.62)}m${f1(-h * 0.33)} 0a${f1(h * 0.33)} ${f1(h * 0.36)} 0 1 0 ${f1(h * 0.66)} 0a${f1(h * 0.33)} ${f1(h * 0.36)} 0 1 0 ${f1(-h * 0.66)} 0Z`
      : `${trunk}M${f1(x)} ${f1(y - h)}L${f1(x + h * 0.27)} ${f1(y - h * 0.22)}H${f1(x - h * 0.27)}Z`)
  }
  return trees.join('')
})
const ground = computed(() => `${profile(ridgeY)}L${props.width} ${props.height}L0 ${props.height}Z`)
const snowBlanket = computed(() => {
  if (!snowy.value) return ''
  let top = `M0 ${f1(ridgeY(0) - 3)}`
  let bottom = ''
  for (let x = 12; x < props.width + 12; x += 12) {
    const cx = Math.min(x, props.width)
    top += `L${f1(cx)} ${f1(ridgeY(cx) - 3 - Math.abs(Math.sin(cx / 37)) * 2.2)}`
  }
  for (let x = props.width; x > -12; x -= 24) bottom += `L${f1(Math.max(0, x))} ${f1(ridgeY(Math.max(0, x)) + 6)}`
  return `${top}${bottom}Z`
})

const GRASS_SPAN = 64
const grassTop = computed(() => g.value.ridge - 58)

function blade(bx: number, base: number, h: number, lean: number): string {
  return `M${f1(bx)} ${f1(base)}Q${f1(bx + lean * 0.25)} ${f1(base - h * 0.55)} ${f1(bx + lean)} ${f1(base - h)}Q${f1(bx + lean * 0.25 + 1.8)} ${f1(base - h * 0.5)} ${f1(bx + 2.6)} ${f1(base)}Z`
}
/** 草丛按 3 个摇摆层 × 3 种色调合并成 9 条路径 */
const grass = computed(() => {
  const rand = seeded(17)
  const scale = season.value === 'summer' ? 1.15 : season.value === 'winter' ? 0.72 : 1
  const paths: string[][] = Array.from({ length: 9 }, () => [])
  let i = 0
  for (let x = 4; x < props.width; x += 16 + rand() * 14, i++) {
    const base = ridgeY(x) + 3
    const n = 3 + Math.floor(rand() * 3)
    for (let k = 0; k < n; k++) {
      const tone = Math.floor(rand() * 3)
      const h = (11 + rand() * 20) * scale
      const lean = (rand() - 0.5) * 9 + (k - n / 2) * 2.2
      paths[(i % 3) * 3 + tone]!.push(blade(x + (k - n / 2) * 2.6 + rand() * 1.5, base, h, lean))
    }
  }
  return [0, 1, 2].map(layer => [0, 1, 2].map(tone => paths[layer * 3 + tone]!.join('')))
})

const flowers = computed(() => {
  const rand = seeded(29)
  const list: { x: number; base: number; h: number; lean: number; kind: 0 | 1; layer: number }[] = []
  const busy = [g.value.fence.x - 10, g.value.tall[g.value.tall.length - 1]! + 16]
  for (let x = 40 + rand() * 60; x < props.width - 16; x += (g.value.narrow ? 70 : 96) + rand() * 110) {
    if (x > busy[0]! && x < busy[1]!) continue
    list.push({ x, base: ridgeY(x) + 2, h: 18 + rand() * 14, lean: (rand() - 0.5) * 8, kind: rand() > 0.5 ? 0 : 1, layer: list.length % 3 })
  }
  return list
})

const TALL_HEIGHTS: Record<Season, [number, number]> = { spring: [26, 30], summer: [46, 56], autumn: [44, 54], winter: [28, 36] }
const tallPlants = computed(() => {
  const rand = seeded(37)
  const heights = TALL_HEIGHTS[season.value]
  return g.value.tall.map((x, i) => ({ x, base: ridgeY(x) + 3, h: (heights[0] + rand() * (heights[1] - heights[0])) * sc.value, lean: (i - 1) * 3 + (rand() - 0.5) * 4, tone: i % 3 }))
})

const fencePosts = computed(() => {
  const { fence, ridge } = g.value
  const n = g.value.narrow ? 3 : 5
  const base = ridge + 4
  return Array.from({ length: n }, (_, i) => {
    const x = fence.x + (fence.w / (n - 1)) * i
    return `M${f1(x - 2.2)} ${base}V${base - 24}L${f1(x)} ${base - 27}L${f1(x + 2.2)} ${base - 24}V${base}Z`
  }).join('')
})
const fenceRails = computed(() => {
  const { fence, ridge } = g.value
  const base = ridge + 4
  return `M${fence.x - 4} ${base - 20}h${fence.w + 8}v3h${-(fence.w + 8)}ZM${fence.x - 4} ${base - 11}h${fence.w + 8}v3h${-(fence.w + 8)}Z`
})

const shrubs = computed(() => g.value.shrubs.map(x => ({ x, base: ridgeY(x) + 3 })))
const pebbles = computed(() => {
  const rand = seeded(41)
  return [0.16, 0.44, 0.7].map(t => {
    const x = t * props.width + (rand() - 0.5) * 40
    return { x, y: ridgeY(x) + 8 + rand() * 4, rx: (3.5 + rand() * 3) * sc.value }
  })
})
const paws = computed(() => {
  if (!snowy.value) return []
  const start = g.value.tall[g.value.tall.length - 1]! + 30
  return Array.from({ length: g.value.narrow ? 4 : 7 }, (_, i) => { const x = start + i * 22; return { x, y: ridgeY(x) + 9 + (i % 2 ? 4 : 0) } })
})

/** 落叶乔木：右侧一棵大树，宽屏时中段再加一棵小树 */
const broadleaves = computed(() => {
  const trees = [{ ...g.value.oak, size: OAK_SIZE * sc.value, main: true }]
  if (g.value.sapling) trees.push({ ...g.value.sapling, size: OAK_SIZE * sc.value * SAPLING_SCALE, main: false })
  return trees.map(t => ({ ...t, style: { left: t.x - t.size / 2 + 'px', top: t.base - t.size + 'px', width: t.size + 'px', height: t.size + 'px' } }))
})
const pineStyle = computed(() => ({
  left: g.value.pine.x - (PINE_SIZE.w / 2) * sc.value + 'px',
  top: g.value.pine.base - PINE_SIZE.h * sc.value + 'px',
  width: PINE_SIZE.w * sc.value + 'px',
  height: PINE_SIZE.h * sc.value + 'px',
}))
const perchStyle = computed(() => ({ left: OAK_PERCH.x * sc.value + 'px', top: OAK_PERCH.y * sc.value + 'px' }))
const showBird = computed(() => lit.value && !wet.value && s.value.wind < 2)
const showOwl = computed(() => !lit.value && !wet.value && s.value.wind < 2)

const butterflies = computed(() => {
  if (!lit.value || s.value.sky !== 'clear' || bare.value) return []
  return (g.value.narrow ? [0.46] : [0.42, 0.5]).map((t, i) => ({ x: t * props.width, y: g.value.ridge - 46, delay: -i * 5.5, tone: i }))
})
const dragonfly = computed(() => lit.value && (s.value.sky === 'partly' || s.value.sky === 'overcast') && !bare.value && s.value.wind < 2)
const fireflies = computed(() => {
  if (s.value.phase !== 'night' || !s.value.warm) return []
  const rand = seeded(67)
  return Array.from({ length: g.value.narrow ? 6 : 12 }, () => ({ x: rand() * props.width, y: g.value.ridge - 90 + rand() * 80, drift: 9 + rand() * 5, blink: 3 + rand() * 2.5, delay: -rand() * 10 }))
})
const drifters = computed(() => {
  if (s.value.wind === 0 || wet.value || snowy.value) return []
  const rand = seeded(71)
  return Array.from({ length: s.value.wind === 2 ? 6 : 4 }, (_, i) => ({ y: 16 + rand() * (g.value.ridge - 40), dur: 11 + rand() * 5, delay: -i * 3.6, kind: i % 2 === 0 ? 'seed' : 'leaf' }))
})

const pseudo = (token: number, salt: number) => ((token * 9301 + salt * 49297) % 233280) / 233280
const flockY = computed(() => 8 + pseudo(props.events.birds ?? 1, 5) * 26)
const leafStart = computed(() => ({
  x: g.value.oak.x + (pseudo(props.events.leaf ?? 1, 3) - 0.5) * 90 * sc.value,
  y: g.value.oak.base - 118 * sc.value,
}))
const hedgehogStart = computed(() => Math.max(10, Math.min(props.width - 400, pseudo(props.events.hedgehog ?? 1, 13) * props.width)))
const squirrelRun = computed(() => Math.min(260, props.width - g.value.oak.x + 30))
</script>

<template>
  <div
    class="scene-garden"
    :class="[`season-${season}`, `wind-${s.wind}`, `phase-${s.phase}`, { 'is-paused': !active, snowy, wet }]"
    :style="{ height: height + 'px' }"
  >
    <!-- 远景：山丘与树影 -->
    <svg class="garden-svg" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`">
      <path class="hill-back" :d="hillBack" />
      <path class="far-trees" :d="farTrees" />
      <path class="hill-mid" :d="hillMid" />
    </svg>

    <!-- 常青松 -->
    <div class="tree pine" :style="pineStyle">
      <svg :viewBox="`0 0 ${PINE_SIZE.w} ${PINE_SIZE.h}`">
        <rect class="pine-trunk" x="36.5" y="100" width="7" height="30" />
        <path class="pine-body" d="M40 4 59 40H49L67 70H54L76 104H4L26 70H13L31 40H21Z" />
        <path class="pine-shade" d="M40 4 59 40H49L67 70H54L76 104H40Z" />
        <path v-if="snowy" class="snow" d="M40 4 48.5 20Q44 18 40 22 36 18 31.5 20ZM22 40Q31 45 40 41 49 45 58 40L53 33Q40 38 27 33ZM14 70Q27 76 40 71 53 76 66 70L60 61Q40 67 20 61Z" />
      </svg>
    </div>

    <!-- 落叶乔木：春樱、夏荫、秋柿、冬枝 -->
    <div v-for="tree in broadleaves" :key="tree.main ? 'oak' : 'sapling'" class="tree oak" :class="{ sapling: !tree.main }" :style="tree.style">
      <svg :viewBox="`0 0 ${OAK_SIZE} ${OAK_SIZE}`">
        <path class="bark" d="M76 170C79 158 80 140 80 122 80 108 76 98 66 88L70 84C78 91 82 98 84 106 87 96 93 88 104 80L107 84C97 93 92 104 91 120 90 140 92 158 96 170Z" />
        <path v-if="tree.main" class="branch" d="M81 116C70 111 56 108 36 109" />
        <template v-if="bare">
          <path class="branch" d="M66 88C58 74 52 62 48 48M66 88C68 70 72 56 74 40M104 80C110 66 118 54 128 44M104 80C102 64 100 50 96 36" />
          <path class="twig" d="M48 48C44 42 42 36 38 30M48 48C54 42 56 36 58 30M128 44C134 38 138 34 144 30M128 44C126 36 126 30 128 24M74 40C72 32 74 24 78 18M96 36C100 30 104 26 110 22M36 109C32 104 30 100 26 98" />
          <template v-if="snowy">
            <ellipse v-for="(p, i) in [[48, 47], [74, 39], [96, 35], [128, 43], [38, 29], [144, 29], [110, 21], [58, 29], [78, 17]]" :key="i" class="snow" :cx="p[0]" :cy="p[1]" rx="3.6" ry="1.5" />
          </template>
          <circle v-for="(p, i) in [[40, 31], [60, 31], [126, 25], [112, 23]]" :key="'berry' + i" class="winter-bud" :cx="p[0]" :cy="p[1]" r="1.6" />
        </template>
        <template v-else>
          <g class="canopy">
            <circle class="c0" cx="58" cy="64" r="28" /><circle class="c0" cx="112" cy="60" r="30" /><circle class="c0" cx="86" cy="40" r="32" />
            <circle class="c1" cx="46" cy="86" r="22" /><circle class="c1" cx="124" cy="88" r="22" /><circle class="c1" cx="85" cy="80" r="30" />
            <circle class="c1" cx="68" cy="38" r="22" /><circle class="c1" cx="106" cy="34" r="22" />
            <circle class="c2" cx="72" cy="52" r="15" /><circle class="c2" cx="100" cy="56" r="13" /><circle class="c2" cx="58" cy="76" r="11" /><circle class="c2" cx="116" cy="74" r="10" />
          </g>
          <template v-if="season === 'spring'">
            <circle v-for="(p, i) in [[60, 50], [78, 30], [98, 44], [116, 66], [70, 72], [92, 70], [50, 80], [128, 82], [104, 22], [84, 58], [62, 34], [118, 46]]" :key="i" class="blossom" :cx="p[0]" :cy="p[1]" r="2.3" />
          </template>
          <template v-else-if="season === 'autumn'">
            <g v-for="(p, i) in [[58, 80], [96, 70], [120, 84], [76, 58], [108, 46], [68, 98], [42, 70]]" :key="i" :transform="`translate(${p[0]} ${p[1]})`">
              <circle class="persimmon" r="3.8" /><path class="calyx" d="M-2-3.4 0-2.2 2-3.4 1-4.6-1-4.6Z" />
            </g>
          </template>
          <template v-if="snowy">
            <ellipse v-for="(p, i) in [[86, 11, 18], [110, 33, 13], [64, 37, 13], [124, 69, 9], [44, 67, 9]]" :key="i" class="snow" :cx="p[0]" :cy="p[1]" :rx="p[2]" ry="4" />
          </template>
        </template>
      </svg>

      <!-- 侧枝上的小鸟：白天梳羽、偶尔跳枝，冬天换成红胸知更鸟；夜里是眨眼的猫头鹰 -->
      <div v-if="tree.main && showBird" class="perch" :class="{ robin: bare || snowy }" :style="perchStyle">
        <div :key="'hop' + (events.perch ?? 0)" class="bird-inner" :class="{ hop: events.perch }">
          <svg viewBox="-12 -16 24 18" width="24" height="18">
            <path class="bird-tail" d="M-6-5.5-12.5-2.5-11.5-7Z" />
            <ellipse class="bird-body" cx="-1" cy="-6" rx="7" ry="5.2" />
            <ellipse class="bird-belly" cx=".8" cy="-4.6" rx="4.6" ry="3.4" />
            <path class="bird-wing" d="M-6.5-7Q-1.5-11.5 3-6.2-2-3.8-6.5-7Z" />
            <circle class="bird-head" cx="4.8" cy="-10" r="3.9" />
            <path class="bird-beak" d="M8.3-10.6 11.4-9.7 8.3-8.8Z" />
            <circle class="bird-eye" cx="6" cy="-10.7" r=".75" />
            <path class="bird-legs" d="M-1.5-1.2-2 1.6M1.6-1.2 1.6 1.6" />
          </svg>
        </div>
      </div>
      <div v-else-if="tree.main && showOwl" class="perch owl" :style="perchStyle">
        <svg viewBox="-9 -20 18 21" width="20" height="23">
          <path class="owl-tuft" d="M-6-14-5-20-2.4-15.4ZM6-14 5-20 2.4-15.4Z" />
          <ellipse class="owl-body" cy="-8.4" rx="7" ry="8.4" />
          <ellipse class="owl-belly" cy="-6" rx="4.4" ry="5.2" />
          <circle class="owl-eye" cx="-2.8" cy="-12.4" r="2.6" /><circle class="owl-eye" cx="2.8" cy="-12.4" r="2.6" />
          <circle class="owl-pupil" cx="-2.8" cy="-12.4" r="1.15" /><circle class="owl-pupil" cx="2.8" cy="-12.4" r="1.15" />
          <g class="owl-lids"><circle cx="-2.8" cy="-12.4" r="2.7" /><circle cx="2.8" cy="-12.4" r="2.7" /></g>
          <path class="owl-beak" d="M-.8-10.6 0-8.8.8-10.6Z" />
          <path class="owl-feet" d="M-2.4 0V1.4M2.4 0V1.4" />
        </svg>
      </div>

      <!-- 雨天：树冠下滴落的水珠 -->
      <template v-if="wet && tree.main">
        <span v-for="(p, i) in [[58, 104], [98, 108], [128, 100]]" :key="'drip' + i" class="drip" :style="{ left: p[0] * sc + 'px', top: p[1] * sc + 'px', animationDelay: i * 0.9 + 's' }"></span>
      </template>
    </div>

    <!-- 中景：灌木与木栅栏 -->
    <svg class="garden-svg" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`">
      <g v-for="(shrub, i) in shrubs" :key="'shrub' + i" :transform="`translate(${f1(shrub.x)} ${f1(shrub.base)}) scale(${sc})`">
        <circle class="shrub" cx="-9" cy="-8" r="9" /><circle class="shrub" cx="3" cy="-12" r="11" /><circle class="shrub" cx="13" cy="-7" r="8" />
        <circle class="shrub-hl" cx="1" cy="-16" r="5" />
        <template v-if="season === 'spring' || season === 'summer'">
          <circle v-for="(p, k) in [[-10, -12], [-2, -18], [6, -10], [12, -12], [-4, -6]]" :key="k" :class="season === 'spring' ? 'shrub-blossom' : 'shrub-flower'" :cx="p[0]" :cy="p[1]" r="1.7" />
        </template>
        <template v-else-if="season === 'winter'">
          <circle v-for="(p, k) in [[-8, -11], [0, -17], [7, -9], [12, -11], [-3, -6]]" :key="k" class="shrub-berry" :cx="p[0]" :cy="p[1]" r="1.7" />
        </template>
        <ellipse v-if="snowy" class="snow" cx="2" cy="-21" rx="9" ry="3" />
      </g>
      <path class="fence-post" :d="fencePosts" />
      <path class="fence-rail" :d="fenceRails" />
    </svg>

    <div
      v-for="layer in [0, 1, 2]"
      :key="'grass' + layer"
      class="grass-layer"
      :class="`layer-${layer}`"
      :style="{ top: grassTop + 'px', height: GRASS_SPAN + 'px' }"
    >
      <svg :width="width" :height="GRASS_SPAN" :viewBox="`0 ${grassTop} ${width} ${GRASS_SPAN}`">
        <!-- 栅栏边的高秆植物随中间一层摇摆 -->
        <g v-if="layer === 1">
          <g v-for="(plant, i) in tallPlants" :key="'tall' + i">
            <path class="flower-stem" :class="{ dry: season === 'winter', reed: season === 'autumn' }" :d="`M${f1(plant.x)} ${f1(plant.base)}Q${f1(plant.x + plant.lean * 0.2)} ${f1(plant.base - plant.h * 0.6)} ${f1(plant.x + plant.lean)} ${f1(plant.base - plant.h)}`" />
            <path v-if="season === 'summer' || season === 'spring'" class="stem-leaf" :d="`M${f1(plant.x + plant.lean * 0.1)} ${f1(plant.base - plant.h * 0.35)}q6 -5 10 -2q-5 4 -10 2Z`" />
            <g :transform="`translate(${f1(plant.x + plant.lean)} ${f1(plant.base - plant.h)}) scale(${sc})`">
              <template v-if="season === 'summer'">
                <ellipse v-for="deg in [0, 30, 60, 90, 120, 150]" :key="deg" class="petal-sun" rx="7.5" ry="2" :transform="`rotate(${deg})`" />
                <circle class="heart-brown" r="3.6" />
              </template>
              <path v-else-if="season === 'spring'" :class="`tulip tone-${plant.tone}`" d="M-4 0C-5-4-4-8-4-9L-2-6 0-10 2-6 4-9C4-8 5-4 4 0Q0 2-4 0Z" />
              <path v-else-if="season === 'autumn'" class="reed-plume" d="M0 0C4-4 6-11 3-18 1-13-2-7 0 0Z" />
              <template v-else>
                <ellipse class="dry-head" rx="1.6" ry="3.6" cy="-2" />
                <ellipse v-if="snowy" class="snow" cy="-5.6" rx="2.4" ry="1.2" />
              </template>
            </g>
          </g>
        </g>
        <path v-for="tone in [0, 1, 2]" :key="tone" :class="`grass tone-${tone}`" :d="grass[layer]![tone]" />
        <g v-for="(f, i) in flowers.filter(item => item.layer === layer)" :key="'f' + i">
          <template v-if="season !== 'winter' || f.kind === 1">
            <path
              class="flower-stem"
              :class="{ reed: season === 'autumn' && f.kind === 1, dry: season === 'winter' }"
              :d="`M${f1(f.x)} ${f1(f.base)}Q${f1(f.x + f.lean * 0.2)} ${f1(f.base - f.h * 0.6)} ${f1(f.x + f.lean)} ${f1(f.base - f.h)}`"
            />
            <g :transform="`translate(${f1(f.x + f.lean)} ${f1(f.base - f.h)})`">
              <template v-if="season === 'spring'">
                <template v-if="f.kind === 0">
                  <ellipse v-for="deg in [0, 45, 90, 135]" :key="deg" class="petal-white" rx="4.4" ry="1.4" :transform="`rotate(${deg})`" />
                  <circle class="heart-yellow" r="1.6" />
                </template>
                <circle v-else class="clover" r="3" />
              </template>
              <template v-else-if="season === 'summer'">
                <ellipse v-for="deg in [0, 45, 90, 135]" :key="deg" class="petal-white" rx="4" ry="1.3" :transform="`rotate(${deg})`" />
                <circle class="heart-yellow" r="1.4" />
              </template>
              <template v-else-if="season === 'autumn'">
                <template v-if="f.kind === 0">
                  <ellipse v-for="deg in [0, 22, 45, 67, 90, 112, 135, 157]" :key="deg" class="petal-mum" rx="4.6" ry="1" :transform="`rotate(${deg})`" />
                  <circle class="heart-mum" r="1.6" />
                </template>
                <path v-else class="reed-plume" d="M0 0C3-3 5-9 3-15C1-11-1-6 0 0Z" />
              </template>
              <ellipse v-else class="dry-head" rx="1.4" ry="3.2" cy="-2" />
            </g>
          </template>
        </g>
      </svg>
    </div>

    <!-- 近景：土地、卵石、水洼、雪与脚印 -->
    <svg class="garden-svg" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`">
      <defs>
        <linearGradient :id="`${uid}-soil`" x1="0" y1="0" x2="0" y2="1">
          <stop offset=".55" style="stop-color: var(--ground-top)" />
          <stop offset="1" style="stop-color: var(--ground-bottom)" />
        </linearGradient>
      </defs>
      <path class="ground-near" :d="ground" :fill="`url(#${uid}-soil)`" />
      <ellipse v-for="(p, i) in pebbles" :key="'p' + i" class="pebble" :cx="f1(p.x)" :cy="f1(p.y)" :rx="f1(p.rx)" :ry="f1(p.rx * 0.55)" />
      <path v-if="snowy" class="snow-blanket" :d="snowBlanket" />
      <g v-for="(paw, i) in paws" :key="'paw' + i" class="paw" :transform="`translate(${f1(paw.x)} ${f1(paw.y)})`">
        <ellipse rx="2" ry="1.6" /><circle cx="-2.2" cy="-2.2" r=".7" /><circle cx="-.8" cy="-3.1" r=".7" /><circle cx=".8" cy="-3.1" r=".7" /><circle cx="2.2" cy="-2.2" r=".7" />
      </g>
      <template v-if="wet">
        <ellipse class="puddle" :cx="g.puddle.x" :cy="g.puddle.y" :rx="g.puddle.rx" ry="4.2" />
        <ellipse v-for="k in 3" :key="'ripple' + k" class="ripple" :cx="g.puddle.x + (k - 2) * g.puddle.rx * 0.38" :cy="g.puddle.y" rx="9" ry="1.6" :style="{ animationDelay: k * 0.8 + 's' }" />
      </template>
    </svg>

    <!-- 雨天：水洼边的青蛙、栅栏上慢慢爬的蜗牛 -->
    <div v-if="wet" class="frog" :style="{ left: g.frogX + 'px', top: ridgeY(g.frogX) + 3 + 'px' }">
      <div :key="'frog' + (events.frog ?? 0)" class="frog-inner" :class="{ hop: events.frog }">
        <svg viewBox="-10 -14 20 15" width="20" height="15">
          <ellipse class="f-body" cy="-4.5" rx="8" ry="5" />
          <ellipse class="f-belly" cy="-3" rx="4.5" ry="3" />
          <circle class="f-eye" cx="-4" cy="-9.5" r="2.8" /><circle class="f-eye" cx="4" cy="-9.5" r="2.8" />
          <circle class="f-pupil" cx="-4" cy="-9.8" r="1.2" /><circle class="f-pupil" cx="4" cy="-9.8" r="1.2" />
          <g class="f-lids"><ellipse cx="-4" cy="-9.5" rx="2.9" ry="2.9" /><ellipse cx="4" cy="-9.5" rx="2.9" ry="2.9" /></g>
          <path class="f-mouth" d="M-2.5-5.6Q0-4 2.5-5.6" />
          <path class="f-legs" d="M-7.5-1.2Q-11-.4-8.6.6M7.5-1.2Q11-.4 8.6.6" />
        </svg>
      </div>
    </div>
    <div
      v-if="wet && s.sky !== 'storm'"
      class="snail"
      :style="{ left: g.fence.x + 2 + 'px', top: g.ridge + 4 - 20 + 'px', '--crawl': g.fence.w * 0.6 + 'px' }"
    >
      <svg viewBox="-10 -12 24 13" width="22" height="12">
        <path class="s-body" d="M-9 0C-9-2-6-2.6-2-2.6H8C10-2.6 11-4 11.5-6.5L12.3-6.3C12.2-3 11-.5 8 0Z" />
        <path class="s-ant" d="M10.6-5.6 12-9.5M11.6-5.2 13.8-8.6" />
        <circle class="s-shell" cx="1" cy="-6.5" r="5.6" />
        <path class="s-spiral" d="M-2.2-6.5A3.2 3.2 0 1 1 1-3.3 2 2 0 1 1 2.6-5.7" />
      </svg>
    </div>

    <!-- 晴天花间的蝴蝶，多云时低飞的蜻蜓 -->
    <div
      v-for="(b, i) in butterflies"
      :key="'butterfly' + i"
      class="butterfly"
      :class="`tone-${b.tone}`"
      :style="{ left: b.x + 'px', top: b.y + 'px', animationDelay: b.delay + 's' }"
    >
      <svg viewBox="-9 -7 18 13" width="18" height="13">
        <g class="b-wing"><path d="M0-1C-3-7-9-7-8-2-7.5 0-4 1 0 0Z" /><path class="b-lower" d="M0 0C-3 1-6 4-4 5.5-2.5 6.5-.5 3 0 1Z" /></g>
        <g class="b-wing"><path d="M0-1C3-7 9-7 8-2 7.5 0 4 1 0 0Z" /><path class="b-lower" d="M0 0C3 1 6 4 4 5.5 2.5 6.5.5 3 0 1Z" /></g>
        <path class="b-body" d="M0-3V3.6" />
      </svg>
    </div>
    <div v-if="dragonfly" class="dragonfly" :style="{ left: g.fence.x + g.fence.w + 24 + 'px', top: g.ridge - 66 + 'px' }">
      <svg viewBox="-15 -6 30 10" width="30" height="10">
        <g class="d-wings"><ellipse cx="-2" cy="-3" rx="6" ry="1.6" transform="rotate(-14 -2 -3)" /><ellipse cx="2" cy="-3" rx="6" ry="1.6" transform="rotate(14 2 -3)" /></g>
        <path class="d-body" d="M-13 0H6" />
        <circle class="d-head" cx="8" r="1.8" />
      </svg>
    </div>

    <span
      v-for="(fly, i) in fireflies"
      :key="'firefly' + i"
      class="firefly"
      :style="{ left: fly.x + 'px', top: fly.y + 'px', animationDuration: `${fly.drift}s, ${fly.blink}s`, animationDelay: `${fly.delay}s, ${fly.delay * 0.7}s` }"
    ></span>

    <!-- 有风：蒲公英与落叶随风飘过花园 -->
    <div
      v-for="(item, i) in drifters"
      :key="'drift' + i"
      class="drifter"
      :class="[item.kind, `fall-${season}`]"
      :style="{ top: item.y + 'px', '--to': width + 'px', animationDuration: item.dur + 's', animationDelay: item.delay + 's' }"
    >
      <svg v-if="item.kind === 'seed'" viewBox="-6 -10 12 12" width="12" height="12"><path d="M0 0V-5M0-5-3.6-7.4M0-5-1.4-9M0-5 1.4-9M0-5 3.6-7.4M0-5-4-5.4M0-5 4-5.4" /></svg>
      <svg v-else viewBox="-1 -6 14 12" width="12" height="10"><path :d="leafPath(12)" /></svg>
    </div>

    <div
      v-if="events.birds"
      :key="'birds' + events.birds"
      class="flock"
      :class="{ rtl: events.birds % 2 === 0 }"
      :style="{ top: flockY + 'px', '--to': width + 'px' }"
    >
      <span
        v-for="(bird, i) in [{ x: 0, y: 0, s: 1, d: 0 }, { x: -24, y: 11, s: 0.82, d: 0.18 }, { x: -44, y: -3, s: 0.7, d: 0.32 }]"
        :key="i"
        class="flying-bird"
        :style="{ left: bird.x + 'px', top: bird.y + 'px', transform: `scale(${bird.s})` }"
      >
        <svg viewBox="0 0 20 8" :style="{ animationDelay: bird.d + 's' }"><path d="M1 6Q5 1 10 5Q15 1 19 6" /></svg>
      </span>
    </div>

    <div v-if="events.swallow" :key="'swallow' + events.swallow" class="swallow" :style="{ top: g.ridge - 42 + 'px', '--to': width + 'px' }">
      <svg viewBox="0 0 30 14" width="26" height="12"><path d="M0 7 10 5.4 14 1l2 4.6L30 3 18 8l-2 5.4L13 8Z" /></svg>
    </div>

    <div
      v-if="events.leaf"
      :key="'leaf' + events.leaf"
      class="falling-leaf"
      :class="`fall-${season}`"
      :style="{ left: leafStart.x + 'px', top: leafStart.y + 'px', '--fall': 108 * sc + 'px' }"
    >
      <svg viewBox="-1 -6 14 12" width="13" height="11">
        <path :d="season === 'spring' ? 'M0 0C2-4 8-5 12 0 8 5 2 4 0 0Z' : leafPath(12)" />
      </svg>
    </div>

    <div v-if="events.squirrel" :key="'squirrel' + events.squirrel" class="squirrel" :style="{ left: g.oak.x + 6 * sc + 'px', top: g.oak.base - 2 + 'px', '--run': squirrelRun + 'px', '--climb': -64 * sc + 'px' }">
      <svg viewBox="-14 -17 28 18" width="24" height="16">
        <path class="sq-tail" d="M6-2C14-4 16-14 10-16 6-17 4-12 7-9 9-7 8-4 6-2Z" />
        <ellipse class="sq-body" cy="-5" rx="6" ry="4.5" />
        <circle class="sq-body" cx="-6" cy="-8" r="3.4" />
        <path class="sq-body" d="M-6.5-11-5.5-14.2-4.4-10.8Z" />
        <circle class="sq-eye" cx="-7.2" cy="-8.6" r=".6" />
        <circle class="sq-nut" cx="-9.6" cy="-6.4" r="1.5" />
        <ellipse class="sq-body" cx="-2" cy="-.6" rx="3" ry="1" />
      </svg>
    </div>

    <div
      v-if="events.rabbit"
      :key="'rabbit' + events.rabbit"
      class="rabbit"
      :class="{ rtl: events.rabbit % 2 === 0 }"
      :style="{ top: g.ridge - 25 + 'px', '--to': width + 'px' }"
    >
      <div class="rabbit-hop">
        <svg viewBox="-14 -26 30 28" width="30" height="28">
          <ellipse class="r-fur" cx="7.5" cy="-21" rx="1.9" ry="6" transform="rotate(-12 7.5 -21)" />
          <ellipse class="r-fur" cx="10.5" cy="-20.5" rx="1.9" ry="6" transform="rotate(14 10.5 -20.5)" />
          <ellipse class="r-ear-in" cx="7.6" cy="-21" rx=".8" ry="4.2" transform="rotate(-12 7.6 -21)" />
          <ellipse class="r-fur" cy="-8" rx="10.5" ry="7.5" />
          <circle class="r-fur" cx="9" cy="-13" r="5.4" />
          <circle class="r-tail" cx="-10" cy="-9" r="3" />
          <ellipse class="r-foot" cx="3" cy="-1" rx="5.5" ry="1.8" />
          <circle class="r-eye" cx="11" cy="-14" r=".8" />
          <circle class="r-nose" cx="14" cy="-12.5" r=".6" />
        </svg>
      </div>
    </div>

    <div
      v-if="events.hedgehog"
      :key="'hedgehog' + events.hedgehog"
      class="hedgehog"
      :style="{ left: hedgehogStart + 'px', top: ridgeY(hedgehogStart + 180) - 13 + 'px' }"
    >
      <div class="hedgehog-waddle">
        <svg viewBox="-16 -15 34 17" width="34" height="17">
          <path class="h-spines" d="M-14 0-15-4-12-6-13-9-9-10-9-13-5-12-3-15 0-12 3-14 5-11 8-12 9-8 12-7 12-3 13 0Z" />
          <path class="h-face" d="M8-6C12-7 15-4 17-1.5L16 0H8Z" />
          <circle class="h-nose" cx="17" cy="-1.6" r=".9" />
          <circle class="h-eye" cx="12.2" cy="-4.2" r=".7" />
          <path class="h-feet" d="M-8 0V1.4M-2 0V1.4M4 0V1.4" />
        </svg>
      </div>
    </div>

    <div class="garden-light"></div>
  </div>
</template>

<style scoped>
.scene-garden {
  --hill-back: #e7eee0;
  --hill-mid: #dbe7d1;
  --far-tree: #c4d6b9;
  --ground-top: #cfe1c2;
  --ground-bottom: #bcd3ae;
  --grass-0: #9cc386;
  --grass-1: #86b373;
  --grass-2: #b2d09a;
  --stem: #7fa06a;
  --bark: #8b6f55;
  --pine: #6d9a72;
  --pine-shade: #5a8661;
  --canopy-0: #6c9f63;
  --canopy-1: #80b271;
  --canopy-2: #9cc786;
  --shrub: #86ad78;
  --shrub-hl: #a3c58f;
  --wood: #c4a886;
  --pebble: #cfcbbd;
  --puddle: rgba(140, 172, 200, .5);
  --ripple: rgba(255, 255, 255, .85);
  --snow: #ffffff;
  --paw: rgba(130, 142, 165, .38);
  --fur: #c4ae95;
  --seed: #bcb6a4;
  --bird: #5d6672;
  --night-light: rgba(64, 76, 140, .14);
  --dusk-light: rgba(255, 170, 120, .10);
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}
.season-spring { --grass-0: #a3cd8a; --grass-1: #8cbe78; --grass-2: #bddba2; --canopy-0: #e3b0bf; --canopy-1: #eec3cf; --canopy-2: #f8dde5; }
.season-summer { --grass-0: #86b873; --grass-1: #6fa463; --grass-2: #9cc786; --ground-top: #c6dcb7; --ground-bottom: #b1cca1; --canopy-0: #5a9558; --canopy-1: #6fa865; --canopy-2: #8dbf7b; }
.season-autumn { --grass-0: #a8bf7c; --grass-1: #c6bf78; --grass-2: #93b06e; --ground-top: #d7ddb9; --ground-bottom: #c6cea4; --hill-back: #eeecd9; --hill-mid: #e4e3c7; --far-tree: #d6c393; --canopy-0: #c97a3f; --canopy-1: #e0a24b; --canopy-2: #efc46a; --shrub: #c08a58; --shrub-hl: #d6a66a; }
.season-winter { --grass-0: #a9b8a0; --grass-1: #b8b496; --grass-2: #97aa90; --ground-top: #dde4d8; --ground-bottom: #cbd4c6; --hill-back: #ebefe8; --hill-mid: #e0e6dc; --far-tree: #c3cfc0; --fur: #ddd2c4; --shrub: #6f8e69; --shrub-hl: #82a07b; }
.dark .scene-garden {
  --hill-back: #1b241e;
  --hill-mid: #1f2a22;
  --far-tree: #18211b;
  --ground-top: #243427;
  --ground-bottom: #1b261e;
  --grass-0: #4c7048;
  --grass-1: #3f6040;
  --grass-2: #5a7f52;
  --stem: #4f6c47;
  --bark: #5f4d3d;
  --pine: #3f6447;
  --pine-shade: #34563c;
  --canopy-0: #3a6339;
  --canopy-1: #467346;
  --canopy-2: #548352;
  --shrub: #46663f;
  --shrub-hl: #557a4c;
  --wood: #6f5c48;
  --pebble: #3d3f3a;
  --puddle: rgba(90, 120, 150, .38);
  --ripple: rgba(200, 220, 240, .45);
  --snow: #dfe6ef;
  --paw: rgba(20, 26, 36, .35);
  --fur: #8f7d6a;
  --seed: #d8d4c8;
  --bird: #a3adba;
  --night-light: rgba(10, 16, 40, .18);
  --dusk-light: rgba(150, 90, 60, .10);
}
.dark .season-spring { --canopy-0: #8c6170; --canopy-1: #9b707e; --canopy-2: #ab838f; }
.dark .season-autumn { --grass-0: #6b7a4c; --grass-1: #7d7748; --grass-2: #59704a; --ground-top: #2c3226; --ground-bottom: #21271d; --canopy-0: #84522d; --canopy-1: #9a7036; --canopy-2: #ab8a45; --shrub: #7a5a3a; --shrub-hl: #8c6a45; }
.dark .season-winter { --grass-0: #55604f; --grass-1: #625f4c; --grass-2: #4b5948; --ground-top: #262c27; --ground-bottom: #1d221e; --shrub: #3d5539; --shrub-hl: #4a6445; }

.garden-svg { position: absolute; left: 0; top: 0; display: block; overflow: visible; }
.hill-back { fill: var(--hill-back); }
.hill-mid { fill: var(--hill-mid); }
.far-trees { fill: var(--far-tree); }
.sapling { animation-duration: 10s; animation-delay: -6s; }

.tree { position: absolute; transform-origin: 50% 100%; animation: tree-sway 12s ease-in-out infinite alternate; will-change: transform; }
.tree > svg { display: block; width: 100%; height: 100%; overflow: visible; }
.pine { animation-duration: 15s; animation-delay: -4s; }
.wind-1 .tree { animation-name: tree-sway-wind; animation-duration: 4s; }
.wind-2 .tree { animation-name: tree-sway-gale; animation-duration: 2.2s; }
.pine-trunk, .bark { fill: var(--bark); }
.branch { fill: none; stroke: var(--bark); stroke-width: 2.6; stroke-linecap: round; }
.twig { fill: none; stroke: var(--bark); stroke-width: 1.4; stroke-linecap: round; }
.pine-body { fill: var(--pine); }
.pine-shade { fill: var(--pine-shade); }
.canopy .c0 { fill: var(--canopy-0); }
.canopy .c1 { fill: var(--canopy-1); }
.canopy .c2 { fill: var(--canopy-2); opacity: .92; }
.blossom { fill: #fff6f8; }
.persimmon { fill: #e8792f; }
.calyx { fill: #6b7d3a; }
.winter-bud { fill: #c94a3e; }
.snow { fill: var(--snow); opacity: .94; }

.shrub { fill: var(--shrub); }
.shrub-hl { fill: var(--shrub-hl); }
.shrub-blossom { fill: #f4c0cf; }
.shrub-flower { fill: #fbfaf2; }
.shrub-berry { fill: #c94a3e; }
.fence-post, .fence-rail { fill: var(--wood); }
.fence-rail { opacity: .9; }

.grass-layer { position: absolute; left: 0; transform-origin: 50% 100%; animation: grass-sway 9s ease-in-out infinite alternate; will-change: transform; }
.grass-layer svg { display: block; overflow: visible; }
.layer-1 { animation-duration: 11s; animation-delay: -3s; }
.layer-2 { animation-duration: 7.5s; animation-delay: -5s; }
.wind-1 .grass-layer { animation-name: grass-sway-wind; animation-duration: 3.4s; }
.wind-1 .layer-1 { animation-duration: 4.1s; }
.wind-2 .grass-layer { animation-name: grass-sway-gale; animation-duration: 1.7s; }
.wind-2 .layer-1 { animation-duration: 2.1s; }
.grass { fill: var(--grass-0); }
.grass.tone-1 { fill: var(--grass-1); }
.grass.tone-2 { fill: var(--grass-2); }
.flower-stem { fill: none; stroke: var(--stem); stroke-width: 1.1; stroke-linecap: round; }
.flower-stem.reed, .flower-stem.dry { stroke: #b9a67a; }
.stem-leaf { fill: var(--stem); }
.petal-white { fill: #fbfaf4; stroke: rgba(160, 170, 150, .35); stroke-width: .3; }
.heart-yellow { fill: #efc14f; }
.clover { fill: #e9a9c4; }
.petal-sun { fill: #f2c94c; }
.heart-brown { fill: #8a6237; }
.petal-mum { fill: #e5ac3f; }
.heart-mum { fill: #c9772e; }
.reed-plume { fill: #e8dfc8; opacity: .9; }
.dry-head { fill: #b39f75; }
.tulip { fill: #e8798b; }
.tulip.tone-1 { fill: #f0c24f; }
.tulip.tone-2 { fill: #f2a7c0; }
.dark .grass-layer g { opacity: .85; }

.ground-near { stroke: none; }
.pebble { fill: var(--pebble); opacity: .8; }
.snow-blanket { fill: var(--snow); opacity: .92; }
.paw { fill: var(--paw); }
.puddle { fill: var(--puddle); }
.ripple { fill: none; stroke: var(--ripple); stroke-width: .8; transform-box: fill-box; transform-origin: center; animation: ripple 2.4s ease-out infinite; opacity: 0; }

.perch { position: absolute; transform: translate(-50%, -100%); }
.bird-inner { transform-origin: 50% 100%; animation: bird-idle 7s ease-in-out infinite; }
.bird-inner svg, .owl svg { display: block; overflow: visible; }
.bird-inner svg { transform: scaleX(-1); }
.bird-inner.hop { animation: bird-hop 2.6s ease-in-out; }
.bird-tail, .bird-wing { fill: #7d6246; }
.bird-body { fill: #a7865f; }
.bird-belly { fill: #ecdfcd; }
.bird-head { fill: #8f6f4f; }
.bird-beak { fill: #e2a64a; }
.bird-eye { fill: #2b241d; }
.bird-legs { fill: none; stroke: #8a6f55; stroke-width: .8; stroke-linecap: round; }
.robin .bird-body, .robin .bird-head { fill: #7f7264; }
.robin .bird-belly { fill: #e07a4f; }
.robin .bird-wing, .robin .bird-tail { fill: #66594c; }
.owl-body, .owl-tuft { fill: #8c7660; }
.owl-belly { fill: #d8c7ae; }
.owl-eye { fill: #f2e3b0; }
.owl-pupil { fill: #2b241d; }
.owl-lids circle { fill: #7d6853; }
.owl-lids { transform-box: view-box; transform-origin: 0 -15px; transform: scaleY(0); animation: blink 6s infinite; }
.owl-beak { fill: #d39a45; }
.owl-feet { fill: none; stroke: #c9a46a; stroke-width: .9; stroke-linecap: round; }
.dark .perch, .dark .frog, .dark .snail, .dark .rabbit, .dark .hedgehog, .dark .squirrel { filter: brightness(.8); }

.drip { position: absolute; width: 2.4px; height: 3.4px; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; background: rgba(140, 180, 215, .9); opacity: 0; animation: drip 2.7s ease-in infinite; }

.frog, .snail, .butterfly, .dragonfly, .firefly, .drifter, .flock, .swallow, .falling-leaf, .squirrel, .rabbit, .hedgehog { position: absolute; }
.frog { transform: translateY(-100%); }
.frog-inner.hop { animation: frog-hop 2.4s ease-in-out; }
.frog svg, .snail svg, .butterfly svg, .dragonfly svg, .rabbit svg, .hedgehog svg, .drifter svg, .squirrel svg, .falling-leaf svg { display: block; overflow: visible; }
.f-body { fill: #7fae6e; }
.f-belly { fill: #d9e8b8; }
.f-eye { fill: #8fbd7c; }
.f-pupil { fill: #2d3328; }
.f-lids ellipse { fill: #7fae6e; }
.f-lids { transform-box: view-box; transform-origin: 0 -12.4px; transform: scaleY(0); animation: blink 5.5s infinite; }
.f-mouth, .f-legs { fill: none; stroke: #5b8a4f; stroke-width: .7; stroke-linecap: round; }
.snail { transform: translateY(-100%); animation: snail-crawl 60s ease-in-out infinite alternate; }
.s-body { fill: #d9c4a6; }
.s-ant { fill: none; stroke: #c4ad8d; stroke-width: .7; stroke-linecap: round; }
.s-shell { fill: #c0915f; }
.s-spiral { fill: none; stroke: #8d6640; stroke-width: .8; }

.butterfly { animation: butterfly-flight 16s ease-in-out infinite; }
.b-wing { transform-box: view-box; transform-origin: 0 0; animation: b-flap .26s ease-in-out infinite alternate; }
.b-wing path { fill: #f2b6c9; }
.b-wing .b-lower { fill: #f6d77a; }
.butterfly.tone-1 .b-wing path { fill: #9ec5e8; }
.butterfly.tone-1 .b-wing .b-lower { fill: #f3c160; }
.season-autumn .butterfly .b-wing path { fill: #e9a15a; }
.season-autumn .butterfly .b-wing .b-lower { fill: #f0cf6c; }
.b-body { fill: none; stroke: #5b4a3a; stroke-width: 1.1; stroke-linecap: round; }
.dragonfly { animation: dragonfly-dart 20s ease-in-out infinite; }
.d-wings ellipse { fill: rgba(210, 228, 240, .7); stroke: rgba(120, 150, 170, .5); stroke-width: .3; }
.d-wings { transform-box: view-box; transform-origin: 0 -3px; animation: d-buzz .08s linear infinite alternate; }
.d-body { fill: none; stroke: #5c8fa8; stroke-width: 1.6; stroke-linecap: round; }
.d-head { fill: #4f7f97; }

.firefly {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #f7f3a8;
  box-shadow: 0 0 6px 2px rgba(247, 243, 168, .55);
  opacity: 0;
  animation-name: firefly-drift, firefly-blink;
  animation-timing-function: ease-in-out, ease-in-out;
  animation-iteration-count: infinite, infinite;
  animation-direction: alternate, normal;
}
html:not(.dark) .firefly { background: #e6d75a; box-shadow: 0 0 6px 2px rgba(214, 196, 70, .5); }

.drifter { left: 0; opacity: 0; animation: drift-across linear infinite; }
.drifter.seed path { fill: none; stroke: var(--seed); stroke-width: .7; stroke-linecap: round; }
.drifter.leaf svg { animation: leaf-spin 1.6s linear infinite; }
.drifter.leaf path, .falling-leaf path { fill: #9fc184; }
.fall-autumn path { fill: #dca24a; }
.fall-spring path { fill: #f4bfcc; }
.fall-winter path { fill: #a8957a; }

.flock { left: 0; width: 20px; height: 8px; animation: flock-fly 18s linear forwards; }
.flock.rtl { animation-name: flock-fly-rtl; }
.flying-bird { position: absolute; width: 20px; height: 8px; }
.flying-bird svg { display: block; width: 100%; height: 100%; overflow: visible; transform-origin: 50% 70%; animation: wing-flap .42s ease-in-out infinite alternate; }
.flying-bird path { fill: none; stroke: var(--bird); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.swallow { left: 0; animation: swallow-skim 7s cubic-bezier(.45, .05, .55, .95) forwards; }
.swallow svg { display: block; }
.swallow path { fill: var(--bird); }
.falling-leaf { animation: leaf-fall 10s ease-in-out forwards; }

.squirrel { animation: squirrel-run 7s ease-in-out forwards; transform-origin: 50% 100%; }
.sq-body { fill: #b8774a; }
.sq-tail { fill: #c98a5a; }
.sq-eye { fill: #2b241d; }
.sq-nut { fill: #8f5f31; }
.rabbit { left: 0; animation: run-across 11s linear forwards; }
.rabbit.rtl { animation-name: run-across-rtl; }
.rabbit-hop { animation: rabbit-hop .55s ease-in-out infinite; transform-origin: 50% 100%; }
.r-fur { fill: var(--fur); }
.r-ear-in { fill: #e8c5b8; }
.r-tail { fill: #f5efe6; }
.r-foot { fill: var(--fur); opacity: .85; }
.r-eye { fill: #3a2f27; }
.r-nose { fill: #c98b80; }
.hedgehog { animation: hedgehog-walk 24s linear forwards; }
.hedgehog-waddle { animation: waddle .5s ease-in-out infinite alternate; }
.h-spines { fill: #7a6450; }
.h-face { fill: #d1b896; }
.h-nose, .h-eye { fill: #2e2620; }
.h-feet { fill: none; stroke: #5c4a3a; stroke-width: 1; stroke-linecap: round; }

/* 夜色与暮色：给整片花园罩一层很淡的光 */
.garden-light { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 1.2s ease; }
.phase-night .garden-light { opacity: 1; background: linear-gradient(to bottom, transparent, var(--night-light) 45%); }
.phase-dusk .garden-light, .phase-dawn .garden-light { opacity: 1; background: linear-gradient(to bottom, transparent, var(--dusk-light) 50%); }

.is-paused, .is-paused * { animation-play-state: paused !important; }

@keyframes tree-sway { from { transform: rotate(-.4deg); } to { transform: rotate(.6deg); } }
@keyframes tree-sway-wind { from { transform: rotate(-.6deg); } to { transform: rotate(1.8deg); } }
@keyframes tree-sway-gale { from { transform: rotate(.8deg); } to { transform: rotate(3.4deg); } }
@keyframes grass-sway { from { transform: skewX(-1.6deg); } to { transform: skewX(2deg); } }
@keyframes grass-sway-wind { from { transform: skewX(1deg); } to { transform: skewX(7deg); } }
@keyframes grass-sway-gale { from { transform: skewX(5deg); } to { transform: skewX(13deg); } }
@keyframes ripple { 0% { transform: scale(.2); opacity: .9; } 100% { transform: scale(1.4); opacity: 0; } }
@keyframes blink { 0%, 93%, 100% { transform: scaleY(0); } 96% { transform: scaleY(1); } }
@keyframes drip { 0%, 40% { transform: translateY(0); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(46px); opacity: 0; } }
@keyframes bird-idle {
  0%, 62%, 100% { transform: rotate(0); }
  68% { transform: rotate(9deg); }
  72% { transform: rotate(0); }
  84% { transform: translateY(-.6px) rotate(-5deg); }
  88% { transform: rotate(0); }
}
@keyframes bird-hop {
  0% { transform: translate(0, 0); }
  18% { transform: translate(-5px, -9px); }
  34% { transform: translate(-10px, 0) scaleX(-1); }
  62% { transform: translate(-10px, 0) scaleX(-1); }
  80% { transform: translate(-5px, -9px); }
  100% { transform: translate(0, 0); }
}
@keyframes frog-hop {
  0%, 100% { transform: translate(0, 0); }
  20% { transform: translate(5px, -16px); }
  40% { transform: translate(10px, 0); }
  60% { transform: translate(10px, 0); }
  80% { transform: translate(5px, -10px); }
}
@keyframes snail-crawl { from { transform: translate(0, -100%); } to { transform: translate(var(--crawl), -100%); } }
@keyframes butterfly-flight {
  0%, 100% { transform: translate(0, 0) rotate(0); }
  20% { transform: translate(38px, -14px) rotate(8deg); }
  40% { transform: translate(86px, 4px) rotate(-6deg); }
  60% { transform: translate(60px, -22px) rotate(10deg); }
  80% { transform: translate(14px, -8px) rotate(-8deg); }
}
@keyframes b-flap { from { transform: scaleX(1); } to { transform: scaleX(.18); } }
@keyframes dragonfly-dart {
  0%, 100% { transform: translate(0, 0); }
  18%, 30% { transform: translate(140px, -8px); }
  48%, 58% { transform: translate(90px, 10px); }
  76%, 86% { transform: translate(230px, -4px); }
}
@keyframes d-buzz { from { transform: scaleY(1); } to { transform: scaleY(.55); } }
@keyframes firefly-drift { from { transform: translate(0, 0); } to { transform: translate(18px, -14px); } }
@keyframes firefly-blink { 0%, 100% { opacity: 0; } 45%, 60% { opacity: .95; } }
@keyframes drift-across {
  0% { transform: translate(-30px, 0) rotate(0); opacity: 0; }
  10% { opacity: .9; }
  35% { transform: translate(calc(var(--to) * .35), -16px) rotate(20deg); }
  65% { transform: translate(calc(var(--to) * .65), 8px) rotate(-14deg); }
  90% { opacity: .9; }
  100% { transform: translate(var(--to), -10px) rotate(10deg); opacity: 0; }
}
@keyframes leaf-spin { to { transform: rotate(360deg); } }
@keyframes flock-fly {
  0% { transform: translate(-80px, 0); }
  25% { transform: translate(calc(var(--to) * .25), -6px); }
  50% { transform: translate(calc(var(--to) * .5), 5px); }
  75% { transform: translate(calc(var(--to) * .75), -5px); }
  100% { transform: translate(calc(var(--to) + 80px), 0); }
}
@keyframes flock-fly-rtl {
  0% { transform: translate(calc(var(--to) + 80px), 0) scaleX(-1); }
  25% { transform: translate(calc(var(--to) * .75), -5px) scaleX(-1); }
  50% { transform: translate(calc(var(--to) * .5), 6px) scaleX(-1); }
  75% { transform: translate(calc(var(--to) * .25), -4px) scaleX(-1); }
  100% { transform: translate(-80px, 0) scaleX(-1); }
}
@keyframes wing-flap { from { transform: scaleY(1); } to { transform: scaleY(-.45); } }
@keyframes swallow-skim {
  0% { transform: translate(calc(var(--to) + 30px), -10px) rotate(-6deg); }
  45% { transform: translate(calc(var(--to) * .55), 18px) rotate(0); }
  60% { transform: translate(calc(var(--to) * .4), 14px) rotate(4deg); }
  100% { transform: translate(-50px, -16px) rotate(12deg); }
}
@keyframes leaf-fall {
  0% { transform: translate(0, 0) rotate(0); opacity: 0; }
  6% { opacity: 1; }
  30% { transform: translate(16px, calc(var(--fall) * .3)) rotate(60deg); }
  60% { transform: translate(-10px, calc(var(--fall) * .65)) rotate(-30deg); }
  85% { transform: translate(8px, var(--fall)) rotate(80deg); opacity: 1; }
  100% { transform: translate(8px, var(--fall)) rotate(80deg); opacity: 0; }
}
@keyframes squirrel-run {
  0% { transform: translate(var(--run), -100%); opacity: 0; }
  8% { opacity: 1; }
  50% { transform: translate(0, -100%); }
  58% { transform: translate(0, -100%) rotate(90deg); }
  88% { transform: translate(0, calc(var(--climb) - 100%)) rotate(90deg); opacity: 1; }
  100% { transform: translate(0, calc(var(--climb) - 100%)) rotate(90deg); opacity: 0; }
}
@keyframes run-across { from { transform: translateX(-40px); } to { transform: translateX(calc(var(--to) + 40px)); } }
@keyframes run-across-rtl { from { transform: translateX(calc(var(--to) + 40px)) scaleX(-1); } to { transform: translateX(-40px) scaleX(-1); } }
@keyframes rabbit-hop {
  0%, 100% { transform: translateY(0) rotate(0); }
  40% { transform: translateY(-13px) rotate(-7deg); }
  78% { transform: translateY(0) rotate(4deg); }
}
@keyframes hedgehog-walk {
  0% { transform: translateX(0); opacity: 0; }
  8% { opacity: 1; }
  92% { opacity: 1; }
  100% { transform: translateX(360px); opacity: 0; }
}
@keyframes waddle { from { transform: translateY(0); } to { transform: translateY(-1px); } }

@media (prefers-reduced-motion: reduce) {
  .scene-garden * { animation: none !important; }
  .flock, .swallow, .falling-leaf, .squirrel, .rabbit, .hedgehog, .drifter, .firefly, .drip { display: none; }
}
</style>
