<script setup lang="ts">
import { HeartPulse, Shuffle } from '@lucide/vue'
import type { HealthTip } from '../types'

defineProps<{
  tip: HealthTip
}>()

const emit = defineEmits<{
  (e: 'next-tip'): void
}>()
</script>

<template>
  <div class="w-full max-w-5xl mx-auto px-4 mt-6">
    <div class="glass-panel rounded-2xl py-3 px-4 sm:px-5 flex items-center justify-between gap-3 text-xs sm:text-sm border border-emerald-500/20 bg-emerald-500/5">
      <div class="flex items-center gap-3 overflow-hidden">
        <div class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
          <HeartPulse class="w-4 h-4" />
        </div>
        <div class="flex items-center gap-2 truncate">
          <span class="font-medium text-emerald-700 dark:text-emerald-400 shrink-0">
            今日微提醒 · {{ tip.tag }}
          </span>
          <span class="text-slate-600 dark:text-slate-300 truncate">
            {{ tip.tip }}
          </span>
        </div>
      </div>

      <button
        @click="emit('next-tip')"
        title="换一个健康微建议"
        class="shrink-0 p-1 rounded-md text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
      >
        <Shuffle class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
