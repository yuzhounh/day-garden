<script setup lang="ts">
import { ref, computed } from 'vue'
import { Activity, Flame, ArrowUpRight, Search, RefreshCw, ShieldCheck, HeartPulse, Sparkles, BookOpen } from 'lucide-vue-next'
import type { SportExercise } from '../types'
import DetailModal from './DetailModal.vue'
import rawSports from '../data/sports-exercise.json'

const props = defineProps<{
  sport: SportExercise
}>()

const emit = defineEmits<{
  (e: 'next-sport'): void
  (e: 'select-sport', sport: SportExercise): void
}>()

const showModal = ref(false)
const showDetail = ref(false)
const searchQuery = ref('')
const filterCategory = ref('全部')
const isRotating = ref(false)

const allSports = rawSports as SportExercise[]

const categories = computed(() => {
  const set = new Set(allSports.map(s => s.category))
  return ['全部', ...Array.from(set)]
})

const filteredSports = computed(() => {
  return allSports.filter(s => {
    if (filterCategory.value !== '全部' && s.category !== filterCategory.value) {
      return false
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      const matchName = s.name.toLowerCase().includes(q)
      const matchCat = s.category.toLowerCase().includes(q)
      const matchBenefit = s.benefits.some(b => b.toLowerCase().includes(q))
      const matchMuscle = s.targetMuscles.some(m => m.toLowerCase().includes(q))
      const matchInsight = s.evidenceInsight.toLowerCase().includes(q)
      if (!matchName && !matchCat && !matchBenefit && !matchMuscle && !matchInsight) {
        return false
      }
    }
    return true
  })
})

function handleRefresh() {
  isRotating.value = true
  emit('next-sport')
  setTimeout(() => {
    isRotating.value = false
  }, 400)
}

const activeSportId = ref<string | null>(props.sport.id)

function handleSetCurrentSport(s: SportExercise) {
  emit('select-sport', s)
  activeSportId.value = s.id
}

function getIntensityColor(intensity: string) {
  if (intensity === '高强度') return 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
  if (intensity === '中等强度') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
}
</script>

<template>
  <article class="glass-panel dashboard-card sports-card">
    <header class="card-heading">
      <div class="section-label">
        <span class="icon-tile emerald"><Activity :size="16" /></span>
        <h2>动健身心</h2>
        <span class="eyebrow">SPORTS & EXERCISE</span>
      </div>
      <button
        class="icon-button small"
        aria-label="换一项运动"
        title="换一项运动"
        @click="handleRefresh"
      >
        <RefreshCw :size="14" :class="{ 'spin-active': isRotating }" />
      </button>
    </header>

    <!-- 运动主卡展示区 -->
    <div class="sport-main-display">
      <div class="sport-title-badge-row">
        <div class="sport-headline">
          <strong class="sport-name">{{ sport.name }}</strong>
          <span class="pill sage mini">{{ sport.category }}</span>
          <span class="pill mini" :class="getIntensityColor(sport.intensity)">{{ sport.intensity }}</span>
        </div>
        <div class="sport-calorie-chip" title="每小时约消耗能量">
          <Flame :size="13" class="text-orange-500" />
          <span>{{ sport.caloriesPerHour }} kcal/h</span>
        </div>
      </div>

      <!-- 核心生理与身心益处 -->
      <div class="sport-benefits-pills">
        <span
          v-for="(benefit, idx) in sport.benefits.slice(0, 3)"
          :key="idx"
          class="benefit-pill"
        >
          <ShieldCheck :size="13" class="text-emerald-500 shrink-0" />
          <span>{{ benefit }}</span>
        </span>
      </div>

      <!-- 循证科学解析 -->
      <div class="sport-insight-box">
        <p class="sport-insight-text">
          <HeartPulse :size="14" class="text-rose-500 shrink-0 inline-block mr-1" />
          <span>{{ sport.evidenceInsight }}</span>
        </p>
      </div>

      <!-- 涉及目标主要肌群 -->
      <div class="sport-muscles-row">
        <span class="muscles-label">主要锻炼肌群：</span>
        <div class="muscle-tags-wrap">
          <span
            v-for="muscle in sport.targetMuscles"
            :key="muscle"
            class="muscle-tag"
          >
            {{ muscle }}
          </span>
        </div>
      </div>
    </div>

    <footer class="card-footer">
      <button class="text-button" @click="showModal = true">
        <BookOpen :size="14" />运动项目库
      </button>
      <div class="inline-actions">
        <span class="footer-hint"><Sparkles :size="12" />科学运动</span>
        <button class="text-button" @click="showDetail = true">
          动作详解<ArrowUpRight :size="14" />
        </button>
      </div>
    </footer>

    <!-- 全量运动项目库弹窗 -->
    <DetailModal
      v-if="showModal"
      title="运动项目与健康益处大观"
      subtitle="运动健身与身心滋养大观 · 感受身体舒展的生命力"
      class="collection-modal"
      @close="showModal = false"
    >
      <!-- 搜索框 -->
      <div class="modal-search-row">
        <div class="search-input-box">
          <Search :size="14" class="text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索运动名称、分类、肌肉、或健康益处..."
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

      <!-- 运动列表 -->
      <div class="sports-modal-list">
        <div
          v-for="item in filteredSports"
          :key="item.id"
          class="modal-sport-card"
        >
          <div class="modal-sport-header">
            <div class="modal-sport-title-group">
              <h3>{{ item.name }}</h3>
              <span class="pill sage mini">{{ item.category }}</span>
              <span class="pill mini" :class="getIntensityColor(item.intensity)">{{ item.intensity }}</span>
              <span class="sport-cal-pill"><Flame :size="12" class="text-orange-500" />约 {{ item.caloriesPerHour }} kcal/h</span>
            </div>
            <button
              class="set-featured-btn"
              :class="{ active: (activeSportId || sport.id) === item.id }"
              title="设为今日卡片推荐"
              @click.stop="handleSetCurrentSport(item)"
            >
              <Check v-if="(activeSportId || sport.id) === item.id" :size="12" />
              <Sparkles v-else :size="12" />
              <span>{{ (activeSportId || sport.id) === item.id ? '当前主页展示中' : '设为今日推荐' }}</span>
            </button>
          </div>

          <!-- 益处要点 -->
          <div class="modal-sport-benefits">
            <span v-for="(b, bi) in item.benefits" :key="bi" class="modal-benefit-badge">
              ✓ {{ b }}
            </span>
          </div>

          <p class="modal-sport-insight">{{ item.evidenceInsight }}</p>

          <div class="modal-sport-footer-row">
            <div class="modal-muscles">
              <span class="text-slate-400">关键肌肉：</span>
              <span class="font-medium text-slate-700 dark:text-slate-300">{{ item.targetMuscles.join(' · ') }}</span>
            </div>
            <div class="modal-tips">
              <span class="text-emerald-600 dark:text-emerald-400 font-medium">💡 建议：</span>
              <span class="text-slate-500 dark:text-slate-400">{{ item.tips }}</span>
            </div>
          </div>
        </div>

        <p v-if="!filteredSports.length" class="empty-state">
          未找到匹配的运动项目，换个关键词试试看。
        </p>
      </div>
    </DetailModal>

    <!-- 单个运动项目动作详解弹窗 -->
    <DetailModal
      v-if="showDetail"
      :title="sport.name + ' · 动作与身心益处详解'"
      :subtitle="sport.category + ' · ' + sport.intensity"
      @close="showDetail = false"
    >
      <div class="modal-sport-title-group mb-3">
        <span class="pill sage">{{ sport.category }}</span>
        <span class="pill" :class="getIntensityColor(sport.intensity)">{{ sport.intensity }}</span>
        <span class="sport-cal-pill"><Flame :size="12" class="text-orange-500" />约 {{ sport.caloriesPerHour }} kcal/h</span>
      </div>

      <div class="reading-note">
        <span class="eyebrow">循证生理益处</span>
        <p>{{ sport.evidenceInsight }}</p>
      </div>

      <div class="space-y-2 mb-4">
        <h4 class="font-semibold text-sm text-slate-800 dark:text-slate-200">核心健康益处</h4>
        <div class="flex flex-wrap gap-2">
          <span v-for="(b, bi) in sport.benefits" :key="bi" class="modal-benefit-badge">
            ✓ {{ b }}
          </span>
        </div>
      </div>

      <div class="space-y-2 mb-4">
        <h4 class="font-semibold text-sm text-slate-800 dark:text-slate-200">主要锻炼肌群</h4>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="m in sport.targetMuscles" :key="m" class="muscle-tag">
            {{ m }}
          </span>
        </div>
      </div>

      <div class="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
        <strong>💡 运动小建议：</strong>{{ sport.tips }}
      </div>
    </DetailModal>
  </article>
</template>

<style scoped>
.sports-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.sport-main-display {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
  flex: 1;
}
.sport-title-badge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.sport-headline {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.sport-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}
.sport-calorie-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(249, 115, 22, 0.08);
  color: #ea580c;
  border: 1px solid rgba(249, 115, 22, 0.2);
}
.sport-benefits-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.benefit-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 8px;
  font-size: 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--ink);
}
.sport-insight-box {
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.15);
}
.sport-insight-text {
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--ink);
}
.sport-muscles-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  flex-wrap: wrap;
}
.muscles-label {
  color: var(--muted);
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 500;
}
.muscle-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.muscle-tag {
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--secondary);
  font-size: 12px;
}
.sports-modal-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  max-height: 560px;
  overflow-y: auto;
  margin-top: 14px;
}
@media (max-width: 680px) {
  .sports-modal-list {
    grid-template-columns: 1fr;
  }
}
.sports-modal-list .empty-state {
  grid-column: 1 / -1;
}
.modal-sport-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.modal-sport-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}
.modal-sport-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.modal-sport-title-group {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.modal-sport-title-group h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}
.sport-cal-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  color: #ea580c;
  background: rgba(249, 115, 22, 0.08);
  padding: 2px 8px;
  border-radius: 6px;
}
.modal-sport-benefits {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 8px;
}
.modal-benefit-badge {
  font-size: 12px;
  color: #059669;
  background: rgba(16, 185, 129, 0.08);
  padding: 3px 8px;
  border-radius: 6px;
}
.modal-sport-insight {
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--ink);
  margin-bottom: 8px;
}
.modal-sport-footer-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  padding-top: 6px;
  border-top: 1px dashed var(--line);
  margin-top: auto;
}
</style>
