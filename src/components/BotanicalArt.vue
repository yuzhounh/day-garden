<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    name?: string
    color?: string
  }>(),
  {
    name: '桂花',
    color: '#e4ba68',
  }
)

const gradientId = useId()

const plantType = computed(() => {
  const n = props.name || ''
  if (n.includes('银杏')) return 'ginkgo'
  if (n.includes('荷花') || n.includes('睡莲')) return 'lotus'
  if (n.includes('牡丹') || n.includes('芍药')) return 'peony'
  if (n.includes('郁金香')) return 'tulip'
  if (n.includes('桃花') || n.includes('樱花') || n.includes('梅花') || n.includes('梨花') || n.includes('海棠')) return 'blossom'
  return 'branch'
})
</script>

<template>
  <svg viewBox="0 0 320 280" fill="none" aria-hidden="true" class="botanical-art">
    <defs>
      <linearGradient :id="gradientId" x1="70" y1="60" x2="250" y2="260" gradientUnits="userSpaceOnUse">
        <stop stop-color="#9eb698" />
        <stop offset="1" stop-color="#4d7965" />
      </linearGradient>
    </defs>

    <!-- Ambient soft backdrop -->
    <ellipse cx="160" cy="255" rx="85" ry="9" fill="#40634b" opacity=".06" />
    <circle cx="165" cy="130" r="92" :fill="color" opacity=".12" />

    <!-- 1. 银杏 (Ginkgo) -->
    <template v-if="plantType === 'ginkgo'">
      <!-- Slender curving stems -->
      <path d="M155 250C158 200 162 150 178 95M160 170C140 145 125 125 105 105M168 135C185 120 205 110 220 95" stroke="#688772" stroke-width="2.2" stroke-linecap="round" />
      <!-- Fan-shaped ginkgo leaves -->
      <g :fill="color">
        <!-- Main top leaf -->
        <path d="M178 95 C140 70, 145 35, 178 40 C195 43, 205 40, 215 48 C225 58, 220 78, 178 95 Z" opacity=".92" />
        <!-- Left fan leaf -->
        <path d="M105 105 C75 85, 78 55, 108 60 C122 62, 132 60, 140 70 C146 80, 138 98, 105 105 Z" opacity=".88" />
        <!-- Right fan leaf -->
        <path d="M220 95 C250 80, 252 50, 225 52 C212 53, 202 50, 192 60 C185 70, 192 88, 220 95 Z" opacity=".88" />
        <!-- Lower small leaf -->
        <path d="M165 145 C145 130, 148 110, 168 115 C178 117, 185 115, 190 122 C194 130, 188 140, 165 145 Z" opacity=".82" />
      </g>
      <!-- Leaf veining details -->
      <path d="M178 95L178 48M178 95L165 52M178 95L192 50M178 95L205 58M105 105L108 68M105 105L95 72M105 105L122 72M220 95L225 60M220 95L210 65M220 95L238 65" stroke="#ffffff" stroke-width="1.2" opacity=".45" stroke-linecap="round" />
    </template>

    <!-- 2. 荷花 / 睡莲 (Lotus / Water Lily) -->
    <template v-else-if="plantType === 'lotus'">
      <!-- Lotus stem -->
      <path d="M160 250C162 200 160 160 160 120" stroke="#5a826a" stroke-width="2.5" stroke-linecap="round" />
      <!-- Floating water lily pad -->
      <ellipse cx="120" cy="225" rx="55" ry="16" :fill="`url(#${gradientId})`" opacity=".75" />
      <path d="M120 225L100 215" stroke="#f4f5f7" stroke-width="2" />
      <!-- Lotus petals -->
      <g :fill="color">
        <path d="M160 85 C140 105, 135 135, 160 155 C185 135, 180 105, 160 85 Z" opacity=".95" />
        <path d="M140 100 C115 118, 120 145, 150 155 C145 135, 130 115, 140 100 Z" opacity=".85" />
        <path d="M180 100 C205 118, 200 145, 170 155 C175 135, 190 115, 180 100 Z" opacity=".85" />
        <path d="M125 115 C100 135, 115 155, 145 158 C135 145, 120 130, 125 115 Z" opacity=".75" />
        <path d="M195 115 C220 135, 205 155, 175 158 C185 145, 200 130, 195 115 Z" opacity=".75" />
      </g>
      <!-- Gold stamen core -->
      <circle cx="160" cy="138" r="8" fill="#e5b842" opacity=".9" />
    </template>

    <!-- 3. 牡丹 / 芍药 (Peony) -->
    <template v-else-if="plantType === 'peony'">
      <!-- Woody / herbaceous stem -->
      <path d="M155 250C158 215 155 180 162 145M156 205C130 190 105 175 90 155M160 185C185 175 210 160 225 140" stroke="#5a826a" stroke-width="2.4" stroke-linecap="round" />
      <!-- Deep green serrated leaves -->
      <g :fill="`url(#${gradientId})`">
        <path d="M90 155C70 140 75 125 85 120C95 125 105 140 90 155Z" />
        <path d="M225 140C245 125 240 110 230 105C220 110 210 125 225 140Z" />
      </g>
      <!-- Lush layered petals -->
      <g :fill="color">
        <circle cx="162" cy="115" r="42" opacity=".4" />
        <circle cx="162" cy="115" r="32" opacity=".6" />
        <path d="M162 82C140 95 138 125 162 138C186 125 184 95 162 82Z" opacity=".95" />
        <path d="M138 98C122 110 125 132 152 135C140 120 132 108 138 98Z" opacity=".9" />
        <path d="M186 98C202 110 199 132 172 135C184 120 192 108 186 98Z" opacity=".9" />
      </g>
      <circle cx="162" cy="118" r="6" fill="#e8c252" />
    </template>

    <!-- 4. 郁金香 (Tulip) -->
    <template v-else-if="plantType === 'tulip'">
      <!-- Upright straight stem -->
      <path d="M160 250L160 125" stroke="#58856a" stroke-width="3" stroke-linecap="round" />
      <!-- Slender arched leaves -->
      <g :fill="`url(#${gradientId})`">
        <path d="M160 240C130 200 115 150 125 100C135 150 148 190 160 220Z" opacity=".9" />
        <path d="M160 230C190 190 205 140 195 90C185 140 172 180 160 210Z" opacity=".85" />
      </g>
      <!-- Cup-shaped flower head -->
      <g :fill="color">
        <path d="M160 65C138 85 138 120 160 128C182 120 182 85 160 65Z" opacity=".95" />
        <path d="M142 75C128 95 132 120 152 126C142 110 136 92 142 75Z" opacity=".85" />
        <path d="M178 75C192 95 188 120 168 126C178 110 184 92 178 75Z" opacity=".85" />
      </g>
    </template>

    <!-- 5. 桃花 / 樱花 / 梨花 / 梅花 (Blossom) -->
    <template v-else-if="plantType === 'blossom'">
      <!-- Rustic flowering bough -->
      <path d="M145 250C155 210 150 165 175 110M155 190C125 165 100 145 85 105M165 165C195 150 225 125 240 85M170 125C158 95 145 75 130 55" stroke="#756254" stroke-width="2.6" stroke-linecap="round" />
      <!-- Fresh budding leaves -->
      <g :fill="`url(#${gradientId})`" opacity=".85">
        <path d="M140 180C120 175 110 168 100 168C112 185 128 192 140 180Z" />
        <path d="M190 140C210 135 220 128 230 128C218 145 202 152 190 140Z" />
      </g>
      <!-- 5-petaled flowers -->
      <g :fill="color">
        <g v-for="(point, i) in [[175,108],[130,54],[85,103],[240,84],[170,148],[115,82],[205,105]]" :key="i" :transform="`translate(${point[0]} ${point[1]}) rotate(${i * 35})`">
          <circle cx="0" cy="-8" r="5" />
          <circle cx="7.6" cy="-2.5" r="5" />
          <circle cx="4.7" cy="6.5" r="5" />
          <circle cx="-4.7" cy="6.5" r="5" />
          <circle cx="-7.6" cy="-2.5" r="5" />
          <circle cx="0" cy="0" r="3.2" fill="#d89e42" />
        </g>
      </g>
    </template>

    <!-- 6. 桂花 / 通用自然植物 (Osmanthus / Default Branch) -->
    <template v-else>
      <path d="M150 253C158 212 158 166 186 105M159 204C123 169 103 141 91 88M163 182C186 166 220 131 238 76M178 124C166 96 154 76 137 54M150 231C119 218 85 196 68 170" stroke="#668571" stroke-width="2.3" stroke-linecap="round" />
      <g :fill="`url(#${gradientId})`">
        <path d="M158 220C181 192 213 196 218 183C216 218 191 231 158 220Z" />
        <path d="M151 215C145 179 117 182 111 164C108 198 128 217 151 215Z" />
        <path d="M165 172C172 141 192 144 203 126C207 155 192 172 165 172Z" />
        <path d="M123 163C93 154 80 144 61 145C74 168 95 179 123 163Z" />
        <path d="M106 130C113 108 103 96 105 79C119 91 129 114 106 130Z" />
        <path d="M210 134C215 104 239 103 250 91C250 115 239 133 210 134Z" />
        <path d="M177 121C196 99 214 103 221 88C219 112 202 126 177 121Z" />
        <path d="M155 81C147 58 125 63 119 46C118 69 132 87 155 81Z" />
        <path d="M88 190C89 164 70 160 62 148C56 171 66 187 88 190Z" />
      </g>
      <!-- Dense fragrant clusters -->
      <g :fill="color">
        <g v-for="(point, i) in [[185,104],[137,53],[91,85],[238,75],[68,168],[187,79],[211,62],[112,63],[72,109]]" :key="i" :transform="`translate(${point[0]} ${point[1]}) rotate(${i * 27})`">
          <ellipse cy="-7" rx="4.4" ry="7" />
          <ellipse cx="7" rx="7" ry="4.4" />
          <ellipse cy="7" rx="4.4" ry="7" />
          <ellipse cx="-7" rx="7" ry="4.4" />
          <circle r="3" fill="#a77b3e" />
        </g>
      </g>
    </template>
  </svg>
</template>
