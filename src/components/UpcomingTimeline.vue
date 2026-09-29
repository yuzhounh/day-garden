<script setup lang="ts">
import { Calendar, Cake, Gift, Heart, Plus, Bell } from '@lucide/vue'
import type { LifeEvent } from '../types'

defineProps<{
  events: LifeEvent[]
}>()

const emit = defineEmits<{
  (e: 'add-event'): void
  (e: 'test-notification'): void
}>()

function getUrgencyBadge(ev: LifeEvent) {
  if (ev.daysLeft === 0) {
    return {
      text: '今天',
      class: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold',
    }
  }
  if (ev.daysLeft !== undefined && ev.daysLeft <= 3) {
    return {
      text: `还有 ${ev.daysLeft} 天`,
      class: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold',
    }
  }
  return {
    text: `还有 ${ev.daysLeft} 天`,
    class: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  }
}
</script>

<template>
  <div class="glass-panel rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/80 flex flex-col justify-between h-full">
    <div>
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <Calendar class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            生活近况 · 节日与纪念日
          </h2>
        </div>
        <button
          @click="emit('add-event')"
          class="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>添加记事</span>
        </button>
      </div>

      <!-- Events List -->
      <div v-if="events.length === 0" class="py-8 text-center text-slate-400 text-xs">
        近期暂无紧迫日程，享受清净一日
      </div>

      <div v-else class="space-y-2.5">
        <div
          v-for="ev in events.slice(0, 4)"
          :key="ev.id"
          class="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white/50 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-800/70 transition"
        >
          <!-- Left icon and title -->
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800">
              <Cake v-if="ev.type === 'birthday'" class="w-4 h-4 text-rose-500" />
              <Heart v-else-if="ev.type === 'anniversary'" class="w-4 h-4 text-pink-500" />
              <Gift v-else class="w-4 h-4 text-emerald-500" />
            </div>

            <div class="truncate">
              <div class="flex items-center gap-2">
                <span class="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                  {{ ev.title }}
                </span>
                <span v-if="ev.role" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {{ ev.role }}
                </span>
              </div>
              <div class="text-[11px] text-slate-400 truncate mt-0.5">
                {{ ev.giftAdvice || ev.nextDateStr }}
              </div>
            </div>
          </div>

          <!-- Right Badge -->
          <div class="shrink-0 ml-3">
            <span
              class="text-xs px-2.5 py-1 rounded-full border"
              :class="getUrgencyBadge(ev).class"
            >
              {{ getUrgencyBadge(ev).text }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Notification Tip Footer -->
    <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
      <span>重要生日自动启用 14天/3天 前预警</span>
      <button
        @click="emit('test-notification')"
        class="inline-flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 transition"
      >
        <Bell class="w-3 h-3" />
        <span>测试提醒</span>
      </button>
    </div>
  </div>
</template>
