<script setup lang="ts">
import { ref, computed } from 'vue'
import { BadgeCheck, ArrowUpRight, ShieldCheck, RefreshCw, BookOpen, Search, Check } from 'lucide-vue-next'
import type { EvidenceGuide } from '../types'
import DetailModal from './DetailModal.vue'
import rawEvidence from '../data/evidence-guide.json'

const props = defineProps<{ guide: EvidenceGuide }>()
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

const activeGuideId = ref<string | null>(props.guide.id)

function setAsCurrentGuide(g: EvidenceGuide) {
  emit('select-guide', g)
  activeGuideId.value = g.id
}
</script>

<template>
  <article class="glass-panel dashboard-card evidence-card">
    <header class="card-heading">
      <div class="section-label">
        <span class="icon-tile sage"><BadgeCheck :size="17" /></span>
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
      <div class="guide-header-row">
        <span class="pill sage">{{ guide.category }}</span>
      </div>
      <h3 class="guide-title">{{ guide.title }}</h3>
      <p class="guide-core-action">{{ guide.coreAction }}</p>

      <div class="guide-insight-box">
        <div class="guide-roi">
          <ShieldCheck :size="15" class="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{{ guide.roi }}</span>
        </div>
        <p class="guide-details-text">{{ guide.details }}</p>
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
      class="collection-modal"
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
        >
          <div class="modal-guide-header">
            <div class="modal-guide-title-row">
              <h3>{{ item.title }}</h3>
              <span class="pill sage mini">{{ item.category }}</span>
            </div>
            <button
              class="set-featured-btn"
              :class="{ active: (activeGuideId || guide.id) === item.id }"
              title="设为今日卡片推荐"
              @click.stop="setAsCurrentGuide(item)"
            >
              <Check v-if="(activeGuideId || guide.id) === item.id" :size="12" />
              <BadgeCheck v-else :size="12" />
              <span>{{ (activeGuideId || guide.id) === item.id ? '当前主页展示中' : '设为今日推荐' }}</span>
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
.evidence-card {
  display: flex;
  flex-direction: column;
}
.guide-body {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  gap: 13px;
  margin: 4px 0 10px;
  flex: 1;
}
.guide-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.guide-title {
  font-family: inherit;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.45;
  color: var(--ink);
  letter-spacing: -0.2px;
  margin: 0;
}
.guide-core-action {
  font-size: 15px;
  line-height: 1.7;
  color: var(--secondary);
  margin: 0;
}
.guide-insight-box {
  padding: 12px 15px;
  border-radius: 13px;
  background: rgba(90, 158, 106, 0.06);
  border: 1px solid rgba(90, 158, 106, 0.16);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.guide-roi {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}
.guide-details-text {
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--ink);
  opacity: 0.92;
  margin: 0;
}
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
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  max-height: 560px;
  overflow-y: auto;
  margin-top: 14px;
}
@media (max-width: 680px) {
  .guide-modal-list {
    grid-template-columns: 1fr;
  }
}
.guide-modal-list .empty-state {
  grid-column: 1 / -1;
}
.modal-guide-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  height: 100%;
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
  margin-top: auto;
}
.modal-guide-roi {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
  font-weight: 500;
}
</style>
