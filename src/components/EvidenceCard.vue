<script setup lang="ts">
import { ref, computed } from 'vue'
import { Sprout, ArrowUpRight, ShieldCheck, RefreshCw, BookOpen, Search } from 'lucide-vue-next'
import type { EvidenceGuide } from '../types'
import DetailModal from './DetailModal.vue'
import rawEvidence from '../data/evidence-guide.json'

defineProps<{ guide: EvidenceGuide }>()
const emit = defineEmits<{
  (e: 'next-guide'): void
  (e: 'select-guide', guide: EvidenceGuide): void
}>()

const showDetail = ref(false)
const showLibrary = ref(false)
const searchQuery = ref('')
const filterCategory = ref('全部')

const allGuides = rawEvidence as EvidenceGuide[]

const categories = computed(() => {
  const set = new Set(allGuides.map(g => g.category))
  return ['全部', ...Array.from(set)]
})

const filteredGuides = computed(() => {
  return allGuides.filter(g => {
    if (filterCategory.value !== '全部' && g.category !== filterCategory.value) {
      return false
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      const matchTitle = g.title.toLowerCase().includes(q)
      const matchAction = g.coreAction.toLowerCase().includes(q)
      const matchDetails = g.details.toLowerCase().includes(q)
      const matchCat = g.category.toLowerCase().includes(q)
      if (!matchTitle && !matchAction && !matchDetails && !matchCat) return false
    }
    return true
  })
})

function selectGuide(g: EvidenceGuide) {
  emit('select-guide', g)
  showLibrary.value = false
}
</script>

<template>
  <article class="glass-panel dashboard-card evidence-card">
    <header class="card-heading">
      <div class="section-label">
        <span class="icon-tile sage"><Sprout :size="17" /></span>
        <h2>生活有方</h2>
        <span class="eyebrow">LIVE A LITTLE BETTER</span>
      </div>
      <button
        class="icon-button small"
        aria-label="换一个生活建议"
        title="换一个生活建议"
        @click="emit('next-guide')"
      >
        <RefreshCw :size="14" />
      </button>
    </header>

    <div class="guide-body">
      <span class="pill sage">{{ guide.category }}</span>
      <h3>{{ guide.title }}</h3>
      <p>{{ guide.coreAction }}</p>
      <div class="guide-action">
        <ShieldCheck :size="15" />
        <span>{{ guide.roi }}</span>
      </div>
    </div>

    <footer class="card-footer">
      <button class="text-button" @click="showLibrary = true">
        <BookOpen :size="14" />生活指南集
      </button>
      <div class="inline-actions">
        <a class="source-name" :href="guide.sourceUrl" target="_blank" rel="noopener noreferrer">
          {{ guide.source }}<ArrowUpRight :size="12" />
        </a>
        <button class="text-button" @click="showDetail = true">
          了解更多<ArrowUpRight :size="14" />
        </button>
      </div>
    </footer>

    <!-- 单篇生活指南详情弹窗 -->
    <DetailModal
      v-if="showDetail"
      :title="guide.title"
      :subtitle="guide.category"
      @close="showDetail = false"
    >
      <div class="reading-note">
        <span class="eyebrow">从今天开始</span>
        <p>{{ guide.coreAction }}</p>
      </div>
      <p class="guide-details">{{ guide.details }}</p>
      <a class="source-link" :href="guide.sourceUrl" target="_blank" rel="noopener noreferrer">
        {{ guide.source }} · 查看原文<ArrowUpRight :size="15" />
      </a>
    </DetailModal>

    <!-- 全量生活指南库浏览弹窗 -->
    <DetailModal
      v-if="showLibrary"
      title="生活有方 · 科学循证日常指南集"
      subtitle="微小改变，持久滋养 · 汇集日常生活科学改善小切口"
      @close="showLibrary = false"
    >
      <!-- 搜索框 -->
      <div class="modal-search-row">
        <div class="search-input-box">
          <Search :size="14" class="text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索日常建议、分类或习惯..."
            class="attraction-search-input"
          />
        </div>
      </div>

      <!-- 分类标签过滤器 -->
      <div class="filter-pills">
        <button
          v-for="cat in categories"
          :key="cat"
          :class="{ active: filterCategory === cat }"
          @click="filterCategory = cat"
        >
          {{ cat }}
        </button>
      </div>

      <!-- 指南列表 -->
      <div class="guide-modal-list">
        <div
          v-for="item in filteredGuides"
          :key="item.id"
          class="modal-guide-card"
          @click="selectGuide(item)"
        >
          <div class="modal-guide-header">
            <div class="modal-guide-title-row">
              <h3>{{ item.title }}</h3>
              <span class="pill sage mini">{{ item.category }}</span>
            </div>
            <button class="text-button text-xs" title="设为当前卡片展示">
              设为当前<ArrowUpRight :size="12" />
            </button>
          </div>
          <p class="modal-guide-action">{{ item.coreAction }}</p>
          <div class="modal-guide-footer">
            <span class="modal-guide-roi"><ShieldCheck :size="13" class="text-emerald-500" />{{ item.roi }}</span>
            <small class="text-slate-400 font-mono">{{ item.source }}</small>
          </div>
        </div>
        <p v-if="!filteredGuides.length" class="empty-state">
          未找到匹配的生活指南，换个关键词试试看。
        </p>
      </div>
    </DetailModal>
  </article>
</template>

<style scoped>
.modal-search-row {
  margin-bottom: 14px;
}
.search-input-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px 12px;
}
.attraction-search-input {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--ink);
  font-size: 13.5px;
  outline: none;
}
.attraction-search-input::placeholder {
  color: var(--muted);
}
.guide-modal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
  margin-top: 14px;
}
.modal-guide-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.2s;
}
.modal-guide-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}
.modal-guide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.modal-guide-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.modal-guide-title-row h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}
.modal-guide-action {
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--secondary);
  margin-bottom: 8px;
}
.modal-guide-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  padding-top: 6px;
  border-top: 1px dashed var(--line);
}
.modal-guide-roi {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
  font-weight: 500;
}
</style>
