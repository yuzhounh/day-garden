<script setup lang="ts">
import { ref } from 'vue'
import { Feather, RefreshCw } from '@lucide/vue'
import type { CuratedPoetry } from '../types'

const props = defineProps<{
  poetry: CuratedPoetry
}>()

const emit = defineEmits<{
  (e: 'next-poetry'): void
}>()

const showFull = ref(false)
</script>

<template>
  <div class="glass-panel rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/80 flex flex-col justify-between h-full">
    <div>
      <!-- Header -->
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <Feather class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            今日一页 · 晨起诗思
          </h2>
        </div>
        <button
          @click="emit('next-poetry')"
          title="换一首诗词"
          class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
        >
          <RefreshCw class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Quote -->
      <div class="my-3">
        <blockquote class="text-sm sm:text-base font-serif italic text-slate-800 dark:text-slate-100 leading-relaxed tracking-wide">
          “{{ poetry.quote }}”
        </blockquote>
      </div>
    </div>

    <!-- Author & Title with ancient seal feel -->
    <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
      <div class="flex items-center gap-2">
        <span class="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-serif">
          {{ poetry.dynasty }}
        </span>
        <span class="font-medium text-slate-700 dark:text-slate-300">{{ poetry.author }}</span>
        <span class="text-slate-400">《{{ poetry.title }}》</span>
      </div>

      <button
        @click="showFull = true"
        class="text-[11px] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
      >
        读全篇
      </button>
    </div>

    <!-- Full Poem Modal -->
    <div
      v-if="showFull"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      @click.self="showFull = false"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-center">
        <h3 class="text-lg font-serif font-medium text-slate-900 dark:text-white">
          {{ poetry.title }}
        </h3>
        <div class="text-xs text-slate-400 my-2">
          〔{{ poetry.dynasty }}〕{{ poetry.author }}
        </div>

        <div class="my-6 text-sm font-serif leading-loose tracking-widest text-slate-800 dark:text-slate-200 whitespace-pre-line">
          {{ poetry.content }}
        </div>

        <button
          @click="showFull = false"
          class="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition"
        >
          收起
        </button>
      </div>
    </div>
  </div>
</template>
