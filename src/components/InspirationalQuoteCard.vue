<script setup lang="ts">
import { ref, computed } from 'vue'
import { Quote as QuoteIcon, Sparkles, RefreshCw, BookOpen, ArrowUpRight, Copy, Check, Lightbulb, Search } from 'lucide-vue-next'
import type { InspirationalQuote } from '../types'
import DetailModal from './DetailModal.vue'
import rawQuotes from '../data/inspirational-quotes.json'

const props = defineProps<{ quote: InspirationalQuote }>()
const emit = defineEmits<{ 'next-quote': []; 'select-quote': [quote: InspirationalQuote] }>()

const showFull = ref(false)
const showList = ref(false)
const copied = ref(false)
const filterTag = ref('全部')
const searchQuery = ref('')

const allQuotes = rawQuotes as InspirationalQuote[]
const tags = computed(() => ['全部', ...Array.from(new Set(allQuotes.map(q => q.tag)))])

const filteredQuotes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return allQuotes.filter(item => {
    if (filterTag.value !== '全部' && item.tag !== filterTag.value) return false
    if (!q) return true
    return (
      item.quote.toLowerCase().includes(q) ||
      item.author.toLowerCase().includes(q) ||
      (item.source && item.source.toLowerCase().includes(q)) ||
      (item.insight && item.insight.toLowerCase().includes(q)) ||
      item.tag.toLowerCase().includes(q)
    )
  })
})

const copiedId = ref<string | null>(null)
const featuredId = ref<string | null>(props.quote.id)

function copyQuote() {
  const text = `“${props.quote.quote}” —— ${props.quote.author} ${props.quote.source || ''}`
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }).catch(() => {})
}

function copyQuoteText(q: InspirationalQuote) {
  const text = `“${q.quote}” —— ${q.author} ${q.source || ''}`
  navigator.clipboard.writeText(text).then(() => {
    copiedId.value = q.id
    setTimeout(() => {
      if (copiedId.value === q.id) copiedId.value = null
    }, 2000)
  }).catch(() => {})
}

function setAsHomeQuote(q: InspirationalQuote) {
  emit('select-quote', q)
  featuredId.value = q.id
}
</script>

<template>
  <article class="glass-panel dashboard-card quote-card">
    <header class="card-heading">
      <div class="section-label">
        <span class="icon-tile sky"><Sparkles :size="16" /></span>
        <h2>名人名言</h2>
        <span class="eyebrow">INSPIRATION</span>
      </div>
      <button class="icon-button small" aria-label="换一则名言" title="换一则名言" @click="emit('next-quote')">
        <RefreshCw :size="14" />
      </button>
    </header>

    <div class="quote-body">
      <span class="quote-symbol" aria-hidden="true"><QuoteIcon :size="28" /></span>
      <blockquote class="quote-text">{{ quote.quote }}</blockquote>
      <div class="quote-author-row">
        <span class="quote-author">{{ quote.author }}</span>
        <span v-if="quote.source" class="quote-dot">·</span>
        <span v-if="quote.source" class="quote-source">{{ quote.source }}</span>
        <span class="pill sky mini">{{ quote.tag }}</span>
      </div>
    </div>

    <div class="quote-insight">
      <Lightbulb :size="16" class="quote-insight-icon" />
      <p>{{ quote.insight }}</p>
    </div>

    <footer class="card-footer">
      <button class="text-button" @click="showList = true">
        <BookOpen :size="14" />名言语录库
      </button>
      <div class="inline-actions">
        <button class="icon-button small" :title="copied ? '已复制' : '复制金句'" aria-label="复制金句" @click="copyQuote">
          <Check v-if="copied" :size="14" class="text-emerald-500" />
          <Copy v-else :size="14" />
        </button>
        <button class="text-button" @click="showFull = true">
          心力解读<ArrowUpRight :size="14" />
        </button>
      </div>
    </footer>

    <!-- 详情弹窗 -->
    <DetailModal
      v-if="showFull"
      :title="quote.author + ' · 励志金句'"
      :subtitle="quote.source || quote.tag"
      @close="showFull = false"
    >
      <template #actions>
        <button
          class="icon-button"
          :class="{ active: copied }"
          :title="copied ? '已复制到剪贴板' : '复制此句至剪贴板'"
          :aria-label="copied ? '已复制到剪贴板' : '复制此句至剪贴板'"
          @click="copyQuote"
        >
          <Check v-if="copied" :size="18" class="text-emerald-500" />
          <Copy v-else :size="18" />
        </button>
      </template>
      <div class="full-quote-modal">
        <blockquote class="modal-quote-text">“{{ quote.quote }}”</blockquote>
        <div class="modal-credit-row">
          <strong>{{ quote.author }}</strong>
          <span v-if="quote.source">· {{ quote.source }}</span>
          <span class="pill sky">{{ quote.tag }}</span>
        </div>
      </div>
      <div class="reading-note" style="margin-bottom: 0;">
        <span class="eyebrow">生活心力解读</span>
        <p>{{ quote.insight }}</p>
      </div>
    </DetailModal>

    <!-- 语录库全量浏览弹窗 -->
    <DetailModal
      v-if="showList"
      title="心力之源 · 励志名人名言小集"
      subtitle="经典思想金句 · 向上生长，滋养心力"
      class="collection-modal"
      @close="showList = false"
    >
      <!-- 搜索框 -->
      <div class="modal-search-row">
        <div class="search-input-box">
          <Search :size="14" class="text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索名言金句、作者、出处或心力启发..."
            class="attraction-search-input"
          />
        </div>
      </div>

      <div class="filter-pills">
        <button
          v-for="t in tags"
          :key="t"
          :class="{ active: filterTag === t }"
          @click="filterTag = t"
        >
          {{ t }}
        </button>
      </div>

      <div v-if="!filteredQuotes.length" class="p-8 text-center text-sm text-slate-400">
        未找到匹配的名言金句，试着换个词搜搜看
      </div>

      <div v-else class="quote-library-list">
        <article
          v-for="item in filteredQuotes"
          :key="item.id"
          class="quote-item-card"
        >
          <div class="quote-item-header">
            <blockquote class="quote-item-text">“{{ item.quote }}”</blockquote>
            <div class="quote-item-meta">
              <span class="quote-item-author">{{ item.author }}</span>
              <span v-if="item.source" class="quote-item-source">· {{ item.source }}</span>
              <span class="pill sky mini">{{ item.tag }}</span>
            </div>
          </div>

          <!-- 生活心力解读：直接在集合卡片里展示，沉浸式阅读 -->
          <div class="quote-item-insight">
            <Lightbulb :size="14" class="quote-insight-icon" />
            <p>{{ item.insight }}</p>
          </div>

          <!-- 卡片底栏操作：不退出弹窗，方便连续向下浏览 -->
          <div class="quote-item-actions">
            <button
              class="text-button text-xs"
              :title="copiedId === item.id ? '已复制到剪贴板' : '复制此句'"
              @click="copyQuoteText(item)"
            >
              <Check v-if="copiedId === item.id" :size="13" class="text-emerald-500" />
              <Copy v-else :size="13" />
              <span>{{ copiedId === item.id ? '已复制' : '复制金句' }}</span>
            </button>

            <button
              class="set-featured-btn"
              :class="{ active: (featuredId || props.quote.id) === item.id }"
              @click="setAsHomeQuote(item)"
            >
              <Check v-if="(featuredId || props.quote.id) === item.id" :size="13" />
              <Sparkles v-else :size="13" />
              <span>{{ (featuredId || props.quote.id) === item.id ? '当前主页展示中' : '设为今日推荐' }}</span>
            </button>
          </div>
        </article>
      </div>
    </DetailModal>
  </article>
</template>
