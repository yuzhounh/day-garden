<script setup lang="ts">
import { ref, computed } from 'vue'
import { Heart, Footprints, Eye, Moon, Check, ArrowUpRight, RefreshCw, BookOpen, Search } from 'lucide-vue-next'
import type { HealthTip } from '../types'
import DetailModal from './DetailModal.vue'
import rawHealthTips from '../data/health-tips.json'
import { dailyActions, toggleHabit } from '../services/sync'

const props = defineProps<{ tip: HealthTip; dateKey: string }>()
const emit = defineEmits<{
  (e: 'next-tip'): void
  (e: 'select-tip', tip: HealthTip): void
}>()

const showSources = ref(false)
const showLibrary = ref(false)
const searchQuery = ref('')
const filterTag = ref('全部')

const allTips = rawHealthTips as HealthTip[]
const tags = computed(() => ['全部', ...Array.from(new Set(allTips.map(t => t.tag)))])

const filteredTips = computed(() => {
  return allTips.filter(t => {
    if (filterTag.value !== '全部' && t.tag !== filterTag.value) {
      return false
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      const matchTip = t.tip.toLowerCase().includes(q)
      const matchTag = t.tag.toLowerCase().includes(q)
      const matchSource = t.source.toLowerCase().includes(q)
      if (!matchTip && !matchTag && !matchSource) return false
    }
    return true
  })
})

function selectTip(t: HealthTip) {
  emit('select-tip', t)
  showLibrary.value = false
}

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
    <header class="card-heading">
      <div class="section-label">
        <span class="icon-tile rose"><Heart :size="17" /></span>
        <h2>好好照顾自己</h2>
        <span class="eyebrow">LITTLE RITUALS</span>
      </div>
      <button
        class="icon-button small"
        aria-label="换一个健康提醒"
        title="换一个健康提醒"
        @click="emit('next-tip')"
      >
        <RefreshCw :size="14" />
      </button>
    </header>

    <div class="wellbeing-layout">
      <div class="wellbeing-intro">
        <div class="progress-ring" :style="{ '--progress': progress + '%' }" role="img" :aria-label="'今日已完成 ' + completed.length + ' 项，共 3 项'">
          <span>{{ completed.length }}<small>/ 3</small></span>
        </div>
        <div>
          <h3>{{ completed.length === 3 ? '今天的自己，也被好好照顾了。' : '小小的行动，也是对自己的温柔。' }}</h3>
          <p aria-live="polite">{{ completed.length === 3 ? '做得很好。明天再慢慢来。' : '每天三件小事，不必赶，慢慢来。' }}</p>
        </div>
      </div>
      <div class="habit-list">
        <button
          v-for="action in actions"
          :key="action.id"
          :class="{ completed: completed.includes(action.id) }"
          :aria-pressed="completed.includes(action.id)"
          @click="toggle(action.id)"
        >
          <span class="habit-icon"><component :is="action.icon" :size="19" /></span>
          <span>
            <strong>{{ action.label }}</strong>
            <small>{{ action.detail }}</small>
          </span>
          <span class="habit-check">
            <Check v-if="completed.includes(action.id)" :size="12" />
          </span>
        </button>
      </div>
    </div>

    <!-- 底部状态栏：左侧健康习惯小集，中间今日微提醒，右侧科学依据 -->
    <footer class="health-tip">
      <button class="text-button shrink-0" @click="showLibrary = true">
        <BookOpen :size="14" />健康习惯集
      </button>

      <div class="health-tip-center flex-1 min-w-0 flex items-center gap-2.5 px-3">
        <span class="pill sage shrink-0">{{ tip.tag }}</span>
        <p class="truncate text-secondary">{{ tip.tip }}</p>
      </div>

      <div class="inline-actions shrink-0">
        <button class="text-button" @click="showSources = true">
          科学指引<ArrowUpRight :size="14" />
        </button>
      </div>
    </footer>

    <!-- 科学指引与依据弹窗 -->
    <DetailModal
      v-if="showSources"
      title="给身体一点温柔的提醒"
      :subtitle="tip.tag + ' · 日常健康小贴士'"
      @close="showSources = false"
    >
      <div class="reading-note">
        <p>{{ tip.tip }}</p>
      </div>
      <a class="source-link" :href="tip.sourceUrl" target="_blank" rel="noopener noreferrer">
        {{ tip.source }}<ArrowUpRight :size="15" />
      </a>
      <h3 class="modal-section-title">今天可以做的三件小事</h3>
      <div class="guidance-list">
        <p><strong>活动一下</strong>在工作间隙离开座位，走动或做适合自己的轻活动。任何活动都比完全不动好。</p>
        <p><strong>让眼睛休息</strong>尝试每看屏幕 20 分钟，看看约 6 米外的物体至少 20 秒，并自然眨眼。</p>
        <p><strong>为睡眠留白</strong>保持规律的作息，为睡眠留出足够时间；18—60 岁成人通常需要每晚至少 7 小时。</p>
      </div>
      <div class="source-list">
        <a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity" target="_blank" rel="noopener noreferrer">WHO · 身体活动指南 ↗</a>
        <a href="https://eyewiki.aao.org/Computer_Vision_Syndrome_%28Digital_Eye_Strain%29" target="_blank" rel="noopener noreferrer">AAO · 屏幕用眼建议 ↗</a>
        <a href="https://www.cdc.gov/sleep/about/" target="_blank" rel="noopener noreferrer">CDC · 睡眠与作息 ↗</a>
      </div>
    </DetailModal>

    <!-- 全量健康微习惯集弹窗 -->
    <DetailModal
      v-if="showLibrary"
      title="好好照顾自己 · 健康微习惯集"
      subtitle="44 条身心照护微习惯 · 温柔对待身体，每日细水长流"
      @close="showLibrary = false"
    >
      <!-- 搜索框 -->
      <div class="modal-search-row">
        <div class="search-input-box">
          <Search :size="14" class="text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索习惯提示、分类或建议..."
            class="attraction-search-input"
          />
        </div>
      </div>

      <!-- 分类标签过滤器 -->
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

      <!-- 习惯列表 -->
      <div class="health-tips-modal-list">
        <div
          v-for="item in filteredTips"
          :key="item.id"
          class="modal-tip-card"
          @click="selectTip(item)"
        >
          <div class="modal-tip-header">
            <span class="pill sage">{{ item.tag }}</span>
            <button class="text-button text-xs" title="设为当前提醒">
              设为当前<ArrowUpRight :size="12" />
            </button>
          </div>
          <p class="modal-tip-text">{{ item.tip }}</p>
          <div class="modal-tip-footer">
            <small class="text-slate-400 font-mono">{{ item.source }}</small>
            <a
              :href="item.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              @click.stop
            >
              参考来源<ArrowUpRight :size="11" />
            </a>
          </div>
        </div>
        <p v-if="!filteredTips.length" class="empty-state">
          未找到匹配的健康习惯，换个关键词试试看。
        </p>
      </div>
    </DetailModal>
  </article>
</template>

<style scoped>
.health-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--line);
  min-height: 54px;
  padding: 6px 0;
}
.health-tip-center {
  min-width: 0;
}
.health-tip-center p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
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
.health-tips-modal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
  margin-top: 14px;
}
.modal-tip-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.2s;
}
.modal-tip-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}
.modal-tip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.modal-tip-text {
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--secondary);
  margin-bottom: 10px;
}
.modal-tip-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  padding-top: 6px;
  border-top: 1px dashed var(--line);
}
</style>
