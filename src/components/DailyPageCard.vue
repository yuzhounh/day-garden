<script setup lang="ts">
import { ref, computed } from 'vue'
import { Feather, ArrowUpRight, RefreshCw, BookOpen, Bookmark, Check } from 'lucide-vue-next'
import type { CuratedPoetry } from '../types'
import DetailModal from './DetailModal.vue'
import rawPoetry from '../data/poetry-curated.json'
import { savedPoetryIds as savedIds, togglePoetry } from '../services/sync'

const props = defineProps<{ poetry: CuratedPoetry }>()
const emit = defineEmits<{ 'next-poetry': []; 'select-poetry': [poetry: CuratedPoetry] }>()
const showFull = ref(false)
const showLibrary = ref(false)
const filter = ref('全部')
const isSaved = computed(() => savedIds.value.includes(props.poetry.id))
const poems = rawPoetry as CuratedPoetry[]
const filteredPoems = computed(() => poems.filter(poem => filter.value === '收藏' ? savedIds.value.includes(poem.id) : filter.value === '全部' || poem.season === filter.value))
const quoteLines = computed(() => props.poetry.quote.match(/[^。！？]+[。！？]?/g) || [props.poetry.quote])
const fullLines = computed(() => props.poetry.content.match(/[^。！？]+[。！？]?/g) || [props.poetry.content])
function toggleSave() {
  togglePoetry(props.poetry.id)
}
function selectPoem(poem: CuratedPoetry) { emit('select-poetry', poem); showLibrary.value = false; showFull.value = true }
</script>

<template>
  <article class="glass-panel dashboard-card poetry-card">
    <header class="card-heading">
      <div class="section-label"><span class="icon-tile lavender"><Feather :size="16" /></span><h2>今日诗笺</h2><span class="eyebrow">DAILY POETRY</span></div>
      <button class="icon-button small" aria-label="换一首诗词" @click="emit('next-poetry')"><RefreshCw :size="14" /></button>
    </header>
    <div class="poetry-body">
      <span class="poetry-quotes" aria-hidden="true">“</span>
      <blockquote><span v-for="(line, i) in quoteLines" :key="i"><span v-for="(phrase, j) in (line.match(/[^，]+，?/g) || [line])" :key="j" class="poetry-phrase">{{ phrase }}</span></span></blockquote>
      <p class="poetry-credit">{{ poetry.author }}<span>·</span>《{{ poetry.title }}》<span class="poetry-seal">{{ poetry.dynasty }}</span></p>
    </div>
    <div class="poetry-reading"><p>{{ poetry.reading || poetry.mood }}</p><span class="pill lavender">{{ poetry.season }}日 · {{ poetry.mood }}</span></div>
    <footer class="card-footer">
      <button class="text-button" @click="showLibrary = true"><BookOpen :size="14" />诗词小集 <span class="muted">{{ poems.length }} 篇</span></button>
      <div class="inline-actions">
        <button class="icon-button small" :aria-label="isSaved ? '取消收藏诗词' : '收藏诗词'" :aria-pressed="isSaved" @click="toggleSave()"><Check v-if="isSaved" :size="15" /><Bookmark v-else :size="15" /></button>
        <button class="text-button" @click="showFull = true">读全篇<ArrowUpRight :size="14" /></button>
      </div>
    </footer>
    <DetailModal v-if="showFull" :title="poetry.title" :subtitle="'〔' + poetry.dynasty + '〕' + poetry.author" @close="showFull = false">
      <div class="full-poem"><p v-for="(line, i) in fullLines" :key="i">{{ line }}</p></div>
      <div class="reading-note"><span class="eyebrow">读诗随想</span><p>{{ poetry.reading || poetry.mood }}</p></div>
      <button class="soft-button" :aria-pressed="isSaved" @click="toggleSave()"><Bookmark :size="15" />{{ isSaved ? '已收藏 · 点击取消' : '收藏这首诗' }}</button>
    </DetailModal>
    <DetailModal v-if="showLibrary" title="把诗意，留在日常" :subtitle="poems.length + ' 篇古典诗词 · 随四季慢慢读'" @close="showLibrary = false">
      <div class="filter-pills"><button v-for="season in ['全部', '春', '夏', '秋', '冬', '收藏']" :key="season" :class="{ active: filter === season }" :aria-pressed="filter === season" @click="filter = season">{{ season }}</button></div>
      <div class="poem-list"><button v-for="poem in filteredPoems" :key="poem.id" @click="selectPoem(poem)"><span><strong>{{ poem.title }}</strong><small>{{ poem.author }} · {{ poem.dynasty }}</small><p>{{ poem.quote }}</p></span><ArrowUpRight :size="16" /></button><p v-if="!filteredPoems.length" class="empty-state">还没有收藏。遇见喜欢的诗，点一下书签留下它。</p></div>
    </DetailModal>
  </article>
</template>
