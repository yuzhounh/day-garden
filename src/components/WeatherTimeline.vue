<script setup lang="ts">
import { ref } from 'vue'
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  Umbrella,
  Thermometer,
  ShieldAlert
} from '@lucide/vue'
import type { WeatherDay } from '../types'

defineProps<{
  days: WeatherDay[]
  loading?: boolean
}>()

const selectedDay = ref<WeatherDay | null>(null)

function getIconComponent(iconName: string) {
  switch (iconName) {
    case 'Sun': return Sun
    case 'CloudSun': return CloudSun
    case 'Cloud': return Cloud
    case 'CloudRain': return CloudRain
    case 'CloudSnow': return CloudSnow
    case 'CloudLightning': return CloudLightning
    case 'CloudFog': return CloudFog
    case 'CloudDrizzle': return CloudDrizzle
    default: return CloudSun
  }
}

function formatDateBrief(dateStr: string) {
  const parts = dateStr.split('-')
  if (parts.length >= 3) {
    return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`
  }
  return dateStr
}
</script>

<template>
  <section class="w-full max-w-5xl mx-auto px-4 mb-6">
    <div class="glass-panel rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/80">
      <!-- Section Title & Hint -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            七日流转 · 天气时间轴
          </span>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
            前 2 天 · 今天 · 后 4 天
          </span>
        </div>
        <span class="text-xs text-slate-400 hidden sm:inline-block">点击任意卡片查看全天指标</span>
      </div>

      <!-- 7-Day Timeline Grid -->
      <div class="grid grid-cols-7 gap-1.5 sm:gap-3 items-stretch">
        <div
          v-for="day in days"
          :key="day.date"
          @click="selectedDay = day"
          class="relative flex flex-col items-center justify-between p-2 sm:p-3.5 rounded-2xl cursor-pointer transition-all duration-200 text-center select-none"
          :class="[
            day.isToday
              ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-2 border-emerald-500/40 dark:border-emerald-400/50 shadow-sm scale-102 z-10'
              : day.isPast
                ? 'opacity-40 hover:opacity-80 bg-slate-100/50 dark:bg-slate-800/30 border border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800/50'
          ]"
        >
          <!-- Date & Day Label -->
          <div class="flex flex-col items-center">
            <span
              class="text-xs sm:text-sm font-medium"
              :class="day.isToday ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-600 dark:text-slate-400'"
            >
              {{ day.dayOfWeek }}
            </span>
            <span class="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {{ formatDateBrief(day.date) }}
            </span>
          </div>

          <!-- Weather Icon -->
          <div class="my-2 sm:my-3">
            <component
              :is="getIconComponent(day.iconName)"
              class="w-6 h-6 sm:w-8 sm:h-8 transition-transform"
              :class="[
                day.isToday
                  ? 'text-emerald-600 dark:text-emerald-400 scale-110'
                  : day.iconName === 'Sun' ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'
              ]"
            />
          </div>

          <!-- Weather Status Text -->
          <span class="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 truncate max-w-full">
            {{ day.weatherText }}
          </span>

          <!-- Temp Range -->
          <div class="flex flex-col items-center text-xs">
            <span class="font-semibold text-slate-800 dark:text-slate-200">
              {{ day.tempMax }}°
            </span>
            <span class="text-[11px] text-slate-400">
              {{ day.tempMin }}°
            </span>
          </div>

          <!-- Rain prob indicator if > 20% -->
          <div
            v-if="day.precipProb >= 20"
            class="mt-1.5 flex items-center gap-0.5 text-[10px] text-sky-600 dark:text-sky-400 font-medium"
          >
            <Umbrella class="w-2.5 h-2.5" />
            <span>{{ day.precipProb }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Weather Detail Modal -->
    <div
      v-if="selectedDay"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      @click.self="selectedDay = null"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span class="text-xs text-slate-400">{{ selectedDay.date }}</span>
            <h3 class="text-xl font-medium text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
              {{ selectedDay.dayOfWeek }} · {{ selectedDay.weatherText }}
            </h3>
          </div>
          <component
            :is="getIconComponent(selectedDay.iconName)"
            class="w-10 h-10 text-emerald-500"
          />
        </div>

        <div class="grid grid-cols-2 gap-3 py-4 text-xs sm:text-sm">
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2.5">
            <Thermometer class="w-4 h-4 text-rose-500" />
            <div>
              <div class="text-slate-400 text-[11px]">最高 / 最低</div>
              <div class="font-medium text-slate-800 dark:text-slate-200">
                {{ selectedDay.tempMax }}°C / {{ selectedDay.tempMin }}°C
              </div>
            </div>
          </div>

          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2.5">
            <Thermometer class="w-4 h-4 text-amber-500" />
            <div>
              <div class="text-slate-400 text-[11px]">体感温度</div>
              <div class="font-medium text-slate-800 dark:text-slate-200">
                约 {{ selectedDay.apparentTempMax }}°C
              </div>
            </div>
          </div>

          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2.5">
            <Umbrella class="w-4 h-4 text-sky-500" />
            <div>
              <div class="text-slate-400 text-[11px]">降水概率</div>
              <div class="font-medium text-slate-800 dark:text-slate-200">
                {{ selectedDay.precipProb }}%
              </div>
            </div>
          </div>

          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2.5">
            <ShieldAlert class="w-4 h-4 text-emerald-500" />
            <div>
              <div class="text-slate-400 text-[11px]">紫外线指数</div>
              <div class="font-medium text-slate-800 dark:text-slate-200">
                {{ selectedDay.uvIndex !== undefined ? selectedDay.uvIndex + ' (适中)' : '无明显辐射' }}
              </div>
            </div>
          </div>
        </div>

        <button
          @click="selectedDay = null"
          class="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition"
        >
          关闭
        </button>
      </div>
    </div>
  </section>
</template>
