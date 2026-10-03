<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Feather, ArrowUpRight, RefreshCw, BookOpen, Bookmark, Check, ChevronDown, ChevronUp, Search } from 'lucide-vue-next'
import type { CuratedPoetry } from '../types'
import DetailModal from './DetailModal.vue'
import rawPoetry from '../data/poetry-curated.json'
import { account, savedPoetryIds as savedIds, togglePoetry } from '../services/sync'

const props = defineProps<{ poetry: CuratedPoetry }>()
const emit = defineEmits<{ 'next-poetry': []; 'select-poetry': [poetry: CuratedPoetry] }>()
const showFull = ref(false)
const showLibrary = ref(false)
const filter = ref('全部')
const searchQuery = ref('')
const filters = computed(() => ['全部', '春', '夏', '秋', '冬', '豁达励志', ...(account.user ? ['收藏'] : [])])
function isPoemSaved(id: string) { return Boolean(account.user) && savedIds.value.includes(id) }
const isSaved = computed(() => isPoemSaved(props.poetry.id))
watch(() => account.user?.id, () => { if (!account.user && filter.value === '收藏') filter.value = '全部' })
const poems = rawPoetry as CuratedPoetry[]
const filteredPoems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return poems.filter(poem => {
    let matchCat = true
    if (filter.value === '收藏') matchCat = isPoemSaved(poem.id)
    else if (filter.value === '全部') matchCat = true
    else if (filter.value === '豁达励志') matchCat = poem.season === '通'
    else matchCat = poem.season === filter.value

    if (!matchCat) return false
    if (!q) return true
    return (
      poem.quote.toLowerCase().includes(q) ||
      poem.title.toLowerCase().includes(q) ||
      poem.author.toLowerCase().includes(q) ||
      poem.dynasty.toLowerCase().includes(q) ||
      poem.content.toLowerCase().includes(q) ||
      (poem.reading && poem.reading.toLowerCase().includes(q)) ||
      (poem.mood && poem.mood.toLowerCase().includes(q))
    )
  })
})
const quoteLines = computed(() => props.poetry.quote.match(/[^。！？]+[。！？]?/g) || [props.poetry.quote])
const fullLines = computed(() => props.poetry.content.match(/[^。！？]+[。！？]?/g) || [props.poetry.content])
function toggleSave() {
  togglePoetry(props.poetry.id)
}

const featuredPoemId = ref<string | null>(props.poetry.id)
const expandedPoemId = ref<string | null>(null)

function toggleExpandPoem(id: string) {
  expandedPoemId.value = expandedPoemId.value === id ? null : id
}

function setAsHomePoem(poem: CuratedPoetry) {
  emit('select-poetry', poem)
  featuredPoemId.value = poem.id
}
</script>

<template>
  <article class="glass-panel dashboard-card poetry-card">
    <header class="card-heading">
      <div class="section-label">
        <span class="icon-tile lavender"><Feather :size="16" /></span>
        <h2>今日诗笺</h2>
        <span class="eyebrow">DAILY POETRY</span>
      </div>
      <button class="icon-button small" aria-label="换一首诗词" title="换一首诗词" @click="emit('next-poetry')">
        <RefreshCw :size="14" />
      </button>
    </header>

    <div class="poetry-body">
      <span class="poetry-quotes" aria-hidden="true">“</span>
      <blockquote>
        <span v-for="(line, i) in quoteLines" :key="i">
          <span v-for="(phrase, j) in (line.match(/[^，]+，?/g) || [line])" :key="j" class="poetry-phrase">{{ phrase }}</span>
        </span>
      </blockquote>
      <div class="poetry-credit">
        <span class="poetry-author-name">{{ poetry.author }}</span>
        <span class="poetry-dot">·</span>
        <span class="poetry-work-title">《{{ poetry.title }}》</span>
        <span class="poetry-seal">{{ poetry.dynasty }}</span>
        <span class="pill lavender mini">{{ poetry.season === '通' ? '常读' : poetry.season + '日' }} · {{ poetry.mood }}</span>
      </div>
    </div>

    <!-- 读诗随想：气泡框 -->
    <div class="poetry-reading">
      <Feather :size="15" class="poetry-reading-icon" />
      <p>{{ poetry.reading || poetry.mood }}</p>
    </div>

    <footer class="card-footer">
      <button class="text-button" @click="showLibrary = true">
        <BookOpen :size="14" />诗词小集
      </button>
      <div class="inline-actions">
        <button v-if="account.user" class="icon-button small" :aria-label="isSaved ? '取消收藏诗词' : '收藏诗词'" :aria-pressed="isSaved" @click="toggleSave()">
          <Check v-if="isSaved" :size="15" />
          <Bookmark v-else :size="15" />
        </button>
        <button class="text-button" @click="showFull = true">
          品读全篇<ArrowUpRight :size="14" />
        </button>
      </div>
    </footer>

    <!-- 单诗全篇弹窗 -->
    <DetailModal v-if="showFull" :title="poetry.title" :subtitle="'〔' + poetry.dynasty + '〕' + poetry.author" @close="showFull = false">
      <template #actions>
        <button
          v-if="account.user"
          class="icon-button"
          :class="{ active: isSaved }"
          :title="isSaved ? '已收藏 · 点击取消' : '收藏这首诗'"
          :aria-label="isSaved ? '已收藏 · 点击取消' : '收藏这首诗'"
          @click="toggleSave()"
        >
          <Bookmark :size="18" :class="isSaved ? 'fill-emerald-500 text-emerald-500' : ''" />
        </button>
      </template>
      <div class="full-poem"><p v-for="(line, i) in fullLines" :key="i">{{ line }}</p></div>
      <div class="reading-note" style="margin-bottom: 0;"><span class="eyebrow">读诗随想</span><p>{{ poetry.reading || poetry.mood }}</p></div>
    </DetailModal>

    <!-- 诗词小集全量沉浸浏览弹窗 -->
    <DetailModal v-if="showLibrary" title="把诗意，留在日常" subtitle="古典诗词典藏 · 随四季与心境慢慢读" class="collection-modal" @close="showLibrary = false">
      <!-- 搜索框 -->
      <div class="modal-search-row">
        <div class="search-input-box">
          <Search :size="14" class="text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索诗词名句、诗人、诗名或随想..."
            class="attraction-search-input"
          />
        </div>
      </div>

      <div class="filter-pills">
        <button v-for="season in filters" :key="season" :class="{ active: filter === season }" :aria-pressed="filter === season" @click="filter = season">
          {{ season }}
        </button>
      </div>

      <div v-if="!filteredPoems.length" class="p-8 text-center text-sm text-slate-400">
        {{ filter === '收藏' ? '还没有收藏。遇见喜欢的诗，点一下书签留下它。' : '未找到匹配的诗词名句，试着换个词搜搜看' }}
      </div>

      <div v-else class="quote-library-list">
        <article
          v-for="poem in filteredPoems"
          :key="poem.id"
          class="quote-item-card"
        >
          <div class="quote-item-header">
            <blockquote class="quote-item-text">“{{ poem.quote }}”</blockquote>
            <div class="quote-item-meta">
              <span class="quote-item-author">{{ poem.author }}</span>
              <span class="quote-item-source">· 《{{ poem.title }}》</span>
              <span class="poetry-seal">{{ poem.dynasty }}</span>
              <span class="pill lavender mini">{{ poem.season === '通' ? '常读' : poem.season + '日' }} · {{ poem.mood }}</span>
            </div>
          </div>

          <!-- 读诗随想：集合内沉浸研读 -->
          <div class="poetry-reading" style="margin-bottom: 4px;">
            <Feather :size="14" class="poetry-reading-icon" />
            <p>{{ poem.reading || poem.mood }}</p>
          </div>

          <!-- 点击展开全篇诗文 -->
          <div v-if="expandedPoemId === poem.id" class="full-poem text-base py-3 border-t border-dashed border-slate-200 dark:border-slate-800 text-center">
            <p v-for="(line, li) in (poem.content.match(/[^。！？]+[。！？]?/g) || [poem.content])" :key="li" class="py-0.5 leading-relaxed">{{ line }}</p>
          </div>

          <!-- 卡片底栏操作：不退出弹窗，方便连续向下浏览 -->
          <div class="quote-item-actions">
            <div class="flex items-center gap-4">
              <button
                v-if="account.user"
                class="text-button text-xs"
                :title="isPoemSaved(poem.id) ? '已收藏 · 点击取消' : '收藏这首诗'"
                :aria-pressed="isPoemSaved(poem.id)"
                @click="togglePoetry(poem.id)"
              >
                <Check v-if="isPoemSaved(poem.id)" :size="13" class="text-emerald-500" />
                <Bookmark v-else :size="13" />
                <span>{{ isPoemSaved(poem.id) ? '已收藏' : '收藏' }}</span>
              </button>

              <button
                class="text-button text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                @click="toggleExpandPoem(poem.id)"
              >
                <span>{{ expandedPoemId === poem.id ? '收起全诗' : '品读全篇' }}</span>
                <ChevronUp v-if="expandedPoemId === poem.id" :size="12" />
                <ChevronDown v-else :size="12" />
              </button>
            </div>

            <button
              class="set-featured-btn"
              :class="{ active: (featuredPoemId || props.poetry.id) === poem.id }"
              @click="setAsHomePoem(poem)"
            >
              <Check v-if="(featuredPoemId || props.poetry.id) === poem.id" :size="13" />
              <Feather v-else :size="13" />
              <span>{{ (featuredPoemId || props.poetry.id) === poem.id ? '当前主页展示中' : '设为今日诗笺' }}</span>
            </button>
          </div>
        </article>
      </div>
    </DetailModal>
  </article>
</template>
