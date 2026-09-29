<script setup lang="ts">
import { MapPin } from '@lucide/vue'
import type { SeasonBloom } from '../types'

defineProps<{
  bloom: SeasonBloom
}>()
</script>

<template>
  <div class="glass-panel rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/80 flex flex-col justify-between h-full">
    <div>
      <!-- Header -->
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="text-sm">{{ bloom.icon }}</span>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            四时物候 · 自然节律
          </h2>
        </div>
        <span class="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
          {{ bloom.status }}
        </span>
      </div>

      <!-- Main Bloom Item -->
      <div class="mt-2">
        <div class="text-lg sm:text-xl font-medium text-slate-900 dark:text-white flex items-center gap-2">
          <span>{{ bloom.name }}</span>
        </div>

        <p class="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-light">
          {{ bloom.description }}
        </p>
      </div>
    </div>

    <!-- Best Spots -->
    <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
      <MapPin class="w-3.5 h-3.5 shrink-0 text-slate-400" />
      <span class="truncate">适宜处：{{ bloom.bestSpot }}</span>
    </div>
  </div>
</template>
