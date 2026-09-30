<script setup lang="ts">
import { useId } from 'vue'
withDefaults(defineProps<{ color?: string }>(), { color: '#e4ba68' })
const gradientId = useId()
</script>

<template>
  <svg viewBox="0 0 320 280" fill="none" aria-hidden="true" class="botanical-art">
    <defs><linearGradient :id="gradientId" x1="70" y1="60" x2="250" y2="260" gradientUnits="userSpaceOnUse"><stop stop-color="#a1b59b"/><stop offset="1" stop-color="#4d7965"/></linearGradient></defs>
    <ellipse cx="159" cy="259" rx="91" ry="9" fill="#40634b" opacity=".06"/>
    <circle cx="169" cy="126" r="100" fill="currentColor" opacity=".06"/>
    <path d="M150 253C158 212 158 166 186 105M159 204C123 169 103 141 91 88M163 182C186 166 220 131 238 76M178 124C166 96 154 76 137 54M150 231C119 218 85 196 68 170" stroke="#668571" stroke-width="2.3" stroke-linecap="round"/>
    <g :fill="`url(#${gradientId})`">
      <path d="M158 220C181 192 213 196 218 183C216 218 191 231 158 220Z"/>
      <path d="M151 215C145 179 117 182 111 164C108 198 128 217 151 215Z"/>
      <path d="M165 172C172 141 192 144 203 126C207 155 192 172 165 172Z"/>
      <path d="M123 163C93 154 80 144 61 145C74 168 95 179 123 163Z"/>
      <path d="M106 130C113 108 103 96 105 79C119 91 129 114 106 130Z"/>
      <path d="M210 134C215 104 239 103 250 91C250 115 239 133 210 134Z"/>
      <path d="M177 121C196 99 214 103 221 88C219 112 202 126 177 121Z"/>
      <path d="M155 81C147 58 125 63 119 46C118 69 132 87 155 81Z"/>
      <path d="M88 190C89 164 70 160 62 148C56 171 66 187 88 190Z"/>
    </g>
    <g :fill="color">
      <g v-for="(point, i) in [[185,104],[137,53],[91,85],[238,75],[68,168],[187,79],[211,62],[112,63],[72,109]]" :key="i" :transform="`translate(${point[0]} ${point[1]}) rotate(${i * 27})`">
        <ellipse cy="-7" rx="4.4" ry="7"/><ellipse cx="7" rx="7" ry="4.4"/><ellipse cy="7" rx="4.4" ry="7"/><ellipse cx="-7" rx="7" ry="4.4"/>
        <circle r="3" fill="#a77b3e"/>
      </g>
    </g>
    <g :fill="color" opacity=".55"><ellipse cx="259" cy="179" rx="3" ry="6" transform="rotate(36 259 179)"/><ellipse cx="56" cy="54" rx="3" ry="6" transform="rotate(-35 56 54)"/><circle cx="223" cy="213" r="2"/></g>
  </svg>
</template>
