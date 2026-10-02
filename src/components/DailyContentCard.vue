<script setup lang="ts">
import { shallowRef, onMounted, watch } from 'vue'
import type { Component } from 'vue'
import { currentDate, currentTime } from '../services/day'
import { contentConfig, selectDailyContent } from '../services/contentSelection'
import type { ContentItem, ContentKind } from '../services/contentSelection'

const props = defineProps<{ kind: ContentKind }>()
const config = contentConfig[props.kind]
const component = shallowRef<Component | null>(null)
const selected = shallowRef<ContentItem | null>(null)
const error = shallowRef('')
let list: ContentItem[] = []
const loaders = {
  dailyPoetry: () => Promise.all([import('./DailyPageCard.vue'), import('../data/poetry-curated.json')]),
  seasonal: () => Promise.all([import('./SeasonalCard.vue'), import('../data/seasons-bloom.json')]),
  evidence: () => Promise.all([import('./EvidenceCard.vue'), import('../data/evidence-guide.json')]),
  inspirationalQuote: () => Promise.all([import('./InspirationalQuoteCard.vue'), import('../data/inspirational-quotes.json')]),
  sportsExercise: () => Promise.all([import('./SportsExerciseCard.vue'), import('../data/sports-exercise.json')]),
  healthTip: () => Promise.all([import('./HealthTipBar.vue'), import('../data/health-tips.json')]),
}
async function load() {
  error.value = ''
  try {
    const [view, data] = await loaders[props.kind]()
    list = data.default as ContentItem[]
    component.value = view.default
    selected.value = selectDailyContent(list, props.kind, currentTime.value)
  } catch { error.value = '内容加载失败，请重试。' }
}
function next() {
  const alternatives = list.filter(item => (item.id || item.name) !== (selected.value?.id || selected.value?.name))
  selected.value = alternatives[Math.floor(Math.random() * alternatives.length)] || selected.value
}
const handlers = { [config.next]: next, [config.select]: (item: ContentItem) => { selected.value = item } }
watch(currentDate, () => { selected.value = selectDailyContent(list, props.kind, currentTime.value) })
onMounted(load)
</script>

<template>
  <component v-if="component && selected" :is="component" v-bind="{ [config.prop]: selected, dateKey: currentDate }" v-on="handlers" />
  <div v-else class="glass-panel p-6" role="status">
    <p>{{ error || '正在打开这张花园卡片…' }}</p>
    <button v-if="error" class="soft-button" @click="load">重试</button>
  </div>
</template>
