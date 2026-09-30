<script setup lang="ts">
import { ref, computed } from 'vue'
import { Quote as QuoteIcon, Sparkles, RefreshCw, BookOpen, ArrowUpRight, Copy, Check } from 'lucide-vue-next'
import type { InspirationalQuote } from '../types'
import DetailModal from './DetailModal.vue'
import rawQuotes from '../data/inspirational-quotes.json'

const props = defineProps<{ quote: InspirationalQuote }>()
const emit = defineEmits<{ 'next-quote': []; 'select-quote': [quote: InspirationalQuote] }>()

const showFull = ref(false)
const showList = ref(false)
const copied = ref(false)
const filterTag = ref('全部')

const allQuotes = rawQuotes as InspirationalQuote[]
const tags = computed(() => ['全部', ...Array.from(new Set(allQuotes.map(q => q.tag)))])

const filteredQuotes = computed(() => {
  if (filterTag.value === '全部') return allQuotes
  return allQuotes.filter(q => q.tag === filterTag.value)
})

function copyQuote() {
  const text = `“${props.quote.quote}” —— ${props.quote.author} ${props.quote.source || ''}`
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }).catch(() => {})
}

function selectQuote(q: InspirationalQuote) {
  emit('select-quote', q)
  showList.value = false
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
        <span v-if="quote.source" class="quote-source">{{ quote.source }}</span>
        <span class="pill sky">{{ quote.tag }}</span>
      </div>
    </div>

    <div class="quote-insight">
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
      <div class="full-quote-modal">
        <blockquote class="modal-quote-text">“{{ quote.quote }}”</blockquote>
        <div class="modal-credit-row">
          <strong>{{ quote.author }}</strong>
          <span v-if="quote.source">· {{ quote.source }}</span>
          <span class="pill sky">{{ quote.tag }}</span>
        </div>
      </div>
      <div class="reading-note">
        <span class="eyebrow">生活心力解读</span>
        <p>{{ quote.insight }}</p>
      </div>
      <button class="soft-button" @click="copyQuote">
        <Check v-if="copied" :size="15" />
        <Copy v-else :size="15" />
        {{ copied ? '已复制到剪贴板' : '复制此句至剪贴板' }}
      </button>
    </DetailModal>

    <!-- 语录库全量浏览弹窗 -->
    <DetailModal
      v-if="showList"
      title="心力之源 · 励志名人名言小集"
      :subtitle="'收录 ' + allQuotes.length + ' 则经典思想金句 · 向上生长'"
      @close="showList = false"
    >
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
      <div class="quote-library-list">
        <button
          v-for="item in filteredQuotes"
          :key="item.id"
          class="quote-item-button"
          @click="selectQuote(item)"
        >
          <div class="quote-item-content">
            <p class="quote-item-text">“{{ item.quote }}”</p>
            <div class="quote-item-author">
              <strong>{{ item.author }}</strong>
              <small v-if="item.source">· {{ item.source }}</small>
              <span class="pill sky mini">{{ item.tag }}</span>
            </div>
          </div>
          <ArrowUpRight :size="16" class="shrink-0 text-slate-400" />
        </button>
      </div>
    </DetailModal>
  </article>
</template>
