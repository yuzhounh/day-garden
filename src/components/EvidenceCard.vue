<script setup lang="ts">
import { ref } from 'vue'
import { ShieldCheck, BookOpen, ExternalLink, ChevronRight } from '@lucide/vue'
import type { EvidenceGuide } from '../types'

defineProps<{
  guide: EvidenceGuide
}>()

const showDetail = ref(false)
</script>

<template>
  <div class="glass-panel rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/80 flex flex-col justify-between h-full">
    <div>
      <!-- Header -->
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <ShieldCheck class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            循证生活 · 高性价比锦囊
          </h2>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
          {{ guide.roi }}
        </span>
      </div>

      <!-- Category & Title -->
      <div class="text-[11px] text-slate-400 mb-1">
        {{ guide.category }}
      </div>

      <h3 class="text-sm sm:text-base font-medium text-slate-900 dark:text-white leading-snug">
        {{ guide.title }}
      </h3>

      <p class="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
        {{ guide.coreAction }}
      </p>
    </div>

    <!-- Source and expand link -->
    <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
      <span class="text-slate-400 truncate max-w-[200px]">{{ guide.source }}</span>
      <button
        @click="showDetail = true"
        class="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
      >
        <span>查阅原委</span>
        <ChevronRight class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Evidence Details Modal -->
    <div
      v-if="showDetail"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      @click.self="showDetail = false"
    >
      <div class="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-1">
          <BookOpen class="w-4 h-4" />
          <span>{{ guide.category }} · {{ guide.roi }}</span>
        </div>

        <h3 class="text-lg font-medium text-slate-900 dark:text-white mt-1">
          {{ guide.title }}
        </h3>

        <div class="my-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed border border-slate-100 dark:border-slate-800">
          {{ guide.details }}
        </div>

        <div class="text-[11px] text-slate-400 flex items-center gap-1.5 mb-5">
          <ExternalLink class="w-3.5 h-3.5 shrink-0" />
          <span>循证出处：{{ guide.source }}</span>
        </div>

        <button
          @click="showDetail = false"
          class="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition"
        >
          知晓并关闭
        </button>
      </div>
    </div>
  </div>
</template>
