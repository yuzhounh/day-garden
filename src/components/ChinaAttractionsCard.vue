<script setup lang="ts">
import { ref, computed } from 'vue'
import { MapPin, Compass, CheckCircle2, Heart, ArrowUpRight, Search, Sparkles, RotateCw } from 'lucide-vue-next'
import type { ChinaAttraction, AttractionStatusType } from '../types'
import DetailModal from './DetailModal.vue'
import rawAttractions from '../data/china-attractions.json'

const props = defineProps<{
  statusMap?: Record<string, AttractionStatusType>
}>()

const emit = defineEmits<{
  (e: 'update:statusMap', newMap: Record<string, AttractionStatusType>): void
}>()

const showModal = ref(false)
const filterTab = ref<'all' | 'visited' | 'wishlist'>('all')
const searchQuery = ref('')
const isRefreshing = ref(false)
const previewOffset = ref(0)

const attractions = rawAttractions as ChinaAttraction[]

const currentStatusMap = computed<Record<string, AttractionStatusType>>(() => props.statusMap || {})

const visitedCount = computed(() => {
  return attractions.filter(a => currentStatusMap.value[a.id] === 'visited').length
})

const wishlistCount = computed(() => {
  return attractions.filter(a => currentStatusMap.value[a.id] === 'wishlist').length
})

const progressPercent = computed(() => {
  if (attractions.length === 0) return 0
  return Math.round((visitedCount.value / attractions.length) * 100)
})

// 首页卡片展示的 3 个推荐景点（支持点击换一批轮换）
const todayFeaturedIndex = computed(() => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return dayOfYear % attractions.length
})

const previewList = computed(() => {
  const start = (todayFeaturedIndex.value + previewOffset.value) % attractions.length
  const list: ChinaAttraction[] = []
  for (let i = 0; i < 3; i++) {
    list.push(attractions[(start + i) % attractions.length]!)
  }
  return list
})

function refreshPreview() {
  isRefreshing.value = true
  // 每次换一批顺延 3 个，触底循环
  previewOffset.value = (previewOffset.value + 3) % attractions.length
  setTimeout(() => {
    isRefreshing.value = false
  }, 400)
}

function getStatus(id: string): AttractionStatusType {
  return currentStatusMap.value[id] || 'unvisited'
}

function toggleStatus(id: string, targetStatus: 'visited' | 'wishlist') {
  const current = getStatus(id)
  const next: AttractionStatusType = current === targetStatus ? 'unvisited' : targetStatus
  const updated = { ...currentStatusMap.value, [id]: next }
  emit('update:statusMap', updated)
}

const filteredList = computed(() => {
  return attractions.filter(a => {
    const s = getStatus(a.id)
    if (filterTab.value === 'visited' && s !== 'visited') return false
    if (filterTab.value === 'wishlist' && s !== 'wishlist') return false

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      const matchName = a.name.toLowerCase().includes(q)
      const matchPlace = a.province.toLowerCase().includes(q) || a.city.toLowerCase().includes(q)
      const matchHighlight = a.highlight.toLowerCase().includes(q)
      if (!matchName && !matchPlace && !matchHighlight) return false
    }

    return true
  })
})
</script>

<template>
  <article class="glass-panel dashboard-card attractions-card">
    <header class="card-heading">
      <div class="section-label">
        <span class="icon-tile sage"><Compass :size="16" /></span>
        <h2>华夏胜景</h2>
        <span class="eyebrow">MUST-VISIT CHINA</span>
      </div>
      <button
        class="refresh-icon-btn"
        title="换一批胜景推荐"
        @click="refreshPreview"
      >
        <RotateCw :size="12" :class="{ 'spin-active': isRefreshing }" />
        <span>换一批</span>
      </button>
    </header>

    <!-- 足迹进度概览 -->
    <div class="attraction-stats-bar">
      <div class="stats-pills">
        <span class="stat-pill visited">
          <CheckCircle2 :size="13" />去过 <strong>{{ visitedCount }}</strong>
        </span>
        <span class="stat-pill wishlist">
          <Heart :size="13" />想去 <strong>{{ wishlistCount }}</strong>
        </span>
      </div>
      <div class="progress-track-wrapper">
        <div class="progress-track" :title="'华夏足迹点亮率：' + progressPercent + '%'">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="progress-percent-label">{{ progressPercent }}% 足迹</span>
      </div>
    </div>

    <!-- 今日精选景点列表 -->
    <div class="attraction-featured-list">
      <div
        v-for="spot in previewList"
        :key="spot.id"
        class="spot-mini-row"
      >
        <div class="spot-mini-info">
          <div class="spot-title-row">
            <strong>{{ spot.name }}</strong>
            <span class="spot-location-tag"><MapPin :size="11" />{{ spot.province }}·{{ spot.city }}</span>
          </div>
          <p class="spot-highlight-text">{{ spot.highlight }}</p>
        </div>
        <div class="spot-actions-group">
          <button
            class="status-btn visited"
            :class="{ active: getStatus(spot.id) === 'visited' }"
            title="点击标记为去过（再次点击取消）"
            @click="toggleStatus(spot.id, 'visited')"
          >
            去过
          </button>
          <button
            class="status-btn wishlist"
            :class="{ active: getStatus(spot.id) === 'wishlist' }"
            title="点击标记为想去（再次点击取消）"
            @click="toggleStatus(spot.id, 'wishlist')"
          >
            想去
          </button>
        </div>
      </div>
    </div>

    <footer class="card-footer">
      <span class="footer-hint"><Sparkles :size="12" />山河辽阔，步履不停</span>
      <button class="text-button" @click="showModal = true">
        点亮更多足迹 (共 {{ attractions.length }} 景)<ArrowUpRight :size="14" />
      </button>
    </footer>

    <!-- 全量景点足迹探索弹窗 -->
    <DetailModal
      v-if="showModal"
      title="中国最值得去的旅游胜景"
      :subtitle="'收录 ' + attractions.length + ' 处华夏名山大川与文化圣地 · 记录你的旅行足迹'"
      @close="showModal = false"
    >
      <!-- 搜索与状态 Tab -->
      <div class="modal-search-row">
        <div class="search-input-box">
          <Search :size="14" class="text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索景点、省市或特色亮点..."
            class="attraction-search-input"
          />
        </div>
      </div>

      <div class="filter-pills">
        <button :class="{ active: filterTab === 'all' }" @click="filterTab = 'all'">全部 ({{ attractions.length }})</button>
        <button :class="{ active: filterTab === 'visited' }" @click="filterTab = 'visited'">已去过 ({{ visitedCount }})</button>
        <button :class="{ active: filterTab === 'wishlist' }" @click="filterTab = 'wishlist'">想去 ({{ wishlistCount }})</button>
      </div>

      <!-- 景点列表 -->
      <div class="attraction-modal-list">
        <div
          v-for="item in filteredList"
          :key="item.id"
          class="modal-spot-card"
        >
          <div class="modal-spot-header">
            <div class="modal-spot-meta">
              <h3>{{ item.name }}</h3>
              <span class="pill sage mini">{{ item.province }} · {{ item.city }}</span>
              <span class="pill lavender mini">{{ item.level }}</span>
            </div>
            <div class="spot-actions-group">
              <button
                class="status-btn visited"
                :class="{ active: getStatus(item.id) === 'visited' }"
                title="点击标记为去过（再次点击取消）"
                @click="toggleStatus(item.id, 'visited')"
              >
                去过
              </button>
              <button
                class="status-btn wishlist"
                :class="{ active: getStatus(item.id) === 'wishlist' }"
                title="点击标记为想去（再次点击取消）"
                @click="toggleStatus(item.id, 'wishlist')"
              >
                想去
              </button>
            </div>
          </div>
          <p class="modal-spot-desc">{{ item.highlight }}</p>
          <div class="modal-spot-sub">
            <span><strong>适宜时节：</strong>{{ item.bestSeason }}</span>
            <span v-if="item.quote" class="modal-spot-quote">“{{ item.quote }}”</span>
          </div>
        </div>
        <p v-if="!filteredList.length" class="empty-state">
          未找到匹配的景点，换个关键词试试看。
        </p>
      </div>
    </DetailModal>
  </article>
</template>
