<script setup lang="ts">
import { ref, computed } from 'vue'
import { Heart, Footprints, Eye, Moon, Check, ArrowUpRight, RefreshCw } from 'lucide-vue-next'
import type { HealthTip } from '../types'
import DetailModal from './DetailModal.vue'
import { dailyActions, toggleHabit } from '../services/sync'

const props = defineProps<{ tip: HealthTip; dateKey: string }>()
const emit = defineEmits<{ 'next-tip': [] }>()
const showSources = ref(false)
const actions = [
  { id: 'move', label: '起来走一走', detail: '给久坐按下暂停键', icon: Footprints },
  { id: 'eyes', label: '看看远处', detail: '让眼睛休息一会儿', icon: Eye },
  { id: 'sleep', label: '留出睡眠时间', detail: '今晚，早点放下屏幕', icon: Moon },
]
const completed = computed(() => dailyActions.value[props.dateKey] || [])
const progress = computed(() => completed.value.length / actions.length * 100)
function toggle(id: string) {
  toggleHabit(props.dateKey, id)
}
</script>

<template>
  <article id="wellbeing" class="glass-panel dashboard-card wellbeing-card">
    <header class="card-heading"><div class="section-label"><span class="icon-tile rose"><Heart :size="17" /></span><h2>好好照顾自己</h2><span class="eyebrow">LITTLE RITUALS</span></div><button class="text-button" @click="showSources = true">健康小贴士<ArrowUpRight :size="14" /></button></header>
    <div class="wellbeing-layout">
      <div class="wellbeing-intro">
        <div class="progress-ring" :style="{ '--progress': progress + '%' }" role="img" :aria-label="'今日已完成 ' + completed.length + ' 项，共 3 项'"><span>{{ completed.length }}<small>/ 3</small></span></div>
        <div><h3>{{ completed.length === 3 ? '今天的自己，也被好好照顾了。' : '小小的行动，也是对自己的温柔。' }}</h3><p aria-live="polite">{{ completed.length === 3 ? '做得很好。明天再慢慢来。' : '每天三件小事，不必赶，慢慢来。' }}</p></div>
      </div>
      <div class="habit-list"><button v-for="action in actions" :key="action.id" :class="{ completed: completed.includes(action.id) }" :aria-pressed="completed.includes(action.id)" @click="toggle(action.id)"><span class="habit-icon"><component :is="action.icon" :size="19" /></span><span><strong>{{ action.label }}</strong><small>{{ action.detail }}</small></span><span class="habit-check"><Check v-if="completed.includes(action.id)" :size="12" /></span></button></div>
    </div>
    <footer class="health-tip"><span class="pill sage">{{ tip.tag }}</span><p>{{ tip.tip }}</p><button class="icon-button small" aria-label="换一个健康提醒" @click="emit('next-tip')"><RefreshCw :size="14" /></button></footer>
    <DetailModal v-if="showSources" title="给身体一点温柔的提醒" :subtitle="tip.tag + ' · 日常健康小贴士'" @close="showSources = false">
      <div class="reading-note"><p>{{ tip.tip }}</p></div>
      <a class="source-link" :href="tip.sourceUrl" target="_blank" rel="noopener noreferrer">{{ tip.source }}<ArrowUpRight :size="15" /></a>
      <h3 class="modal-section-title">今天可以做的三件小事</h3>
      <div class="guidance-list"><p><strong>活动一下</strong>在工作间隙离开座位，走动或做适合自己的轻活动。任何活动都比完全不动好。</p><p><strong>让眼睛休息</strong>尝试每看屏幕 20 分钟，看看约 6 米外的物体至少 20 秒，并自然眨眼。</p><p><strong>为睡眠留白</strong>保持规律的作息，为睡眠留出足够时间；18—60 岁成人通常需要每晚至少 7 小时。</p></div>
      <div class="source-list"><a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity" target="_blank" rel="noopener noreferrer">WHO · 身体活动指南 ↗</a><a href="https://eyewiki.aao.org/Computer_Vision_Syndrome_%28Digital_Eye_Strain%29" target="_blank" rel="noopener noreferrer">AAO · 屏幕用眼建议 ↗</a><a href="https://www.cdc.gov/sleep/about/" target="_blank" rel="noopener noreferrer">CDC · 睡眠与作息 ↗</a></div>
    </DetailModal>
  </article>
</template>
