<script setup lang="ts">
import { ref, computed } from 'vue'
import { Flower2, MapPin, ArrowUpRight, RefreshCw, BookOpen, Search } from 'lucide-vue-next'
import type { SeasonBloom } from '../types'
import DetailModal from './DetailModal.vue'
import BotanicalArt from './BotanicalArt.vue'
import BotanicalIcon from './BotanicalIcon.vue'
import ScentIcon from './ScentIcon.vue'
import rawSeasons from '../data/seasons-bloom.json'

const props = defineProps<{ bloom: SeasonBloom }>()
const emit = defineEmits<{
  (e: 'next-bloom'): void
  (e: 'select-bloom', bloom: SeasonBloom): void
}>()

const showCalendar = ref(false)
const showDetail = ref(false)
const month = ref(new Date().getMonth() + 1)
const searchQuery = ref('')
const list = rawSeasons as SeasonBloom[]
const filteredBlooms = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    return list.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.solarTerms.some(st => st.toLowerCase().includes(q)) ||
      item.status.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.bestSpot.toLowerCase().includes(q) ||
      item.observation.toLowerCase().includes(q)
    )
  }
  return list.filter(item => item.months.includes(month.value))
})
function monthRange(months: number[]) {
  return months[0] + '—' + (months[0]! > months[months.length - 1]! ? '次年 ' : '') + months[months.length - 1] + ' 月'
}
const activeBloomName = ref<string | null>(props.bloom.name)
function selectBloomItem(item: SeasonBloom) {
  emit('select-bloom', item)
  activeBloomName.value = item.name
}
</script>

<template>
  <article id="seasonal" class="glass-panel dashboard-card seasonal-card">
    <header class="card-heading">
      <div class="section-label">
        <span class="icon-tile peach"><Flower2 :size="17" /></span>
        <h2>四时花信</h2>
        <span class="eyebrow">IN SEASON</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="pill peach bloom-status-pill"><span class="status-dot"></span>{{ bloom.status }}</span>
        <button
          class="icon-button small"
          aria-label="换一朵花信"
          title="换一朵花信"
          @click="emit('next-bloom')"
        >
          <RefreshCw :size="14" />
        </button>
      </div>
    </header>

    <div class="bloom-scene">
      <div class="bloom-copy">
        <p class="eyebrow">{{ monthRange(bloom.months) }} · {{ bloom.solarTerms.join(' / ') }}</p>
        <h3>{{ bloom.name }}</h3>
        <p>{{ bloom.description }}</p>
      </div>
      <BotanicalArt :name="bloom.name" :color="bloom.color" />
    </div>

    <div class="bloom-observation">
      <ScentIcon :size="16" />
      <p>{{ bloom.observation }}</p>
    </div>

    <div class="bloom-spot-row">
      <div class="spot-label"><MapPin :size="13" /><span>寻芳赏鉴：{{ bloom.bestSpot }}</span></div>
      <div class="spot-term">适逢节气：{{ bloom.solarTerms.join(' · ') }}</div>
    </div>

    <footer class="card-footer">
      <button class="text-button" @click="showCalendar = true">
        <BookOpen :size="14" />全年花期谱
      </button>
      <button class="text-button" @click="showDetail = true">
        物候细品<ArrowUpRight :size="14" />
      </button>
    </footer>

    <!-- 单花物候细品弹窗 -->
    <DetailModal
      v-if="showDetail"
      :title="bloom.name + ' · 四时花信物候'"
      :subtitle="monthRange(bloom.months) + ' · ' + bloom.solarTerms.join(' / ')"
      @close="showDetail = false"
    >
      <div class="bloom-detail-hero">
        <div class="bloom-copy">
          <span class="pill peach mb-2"><span class="status-dot"></span>{{ bloom.status }}</span>
          <p class="text-base text-secondary leading-relaxed mt-2">{{ bloom.description }}</p>
        </div>
      </div>
      <div class="reading-note">
        <span class="eyebrow flex items-center gap-1.5"><ScentIcon :size="14" />物候微观观察与嗅觉感知</span>
        <p>{{ bloom.observation }}</p>
      </div>
      <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
        <span class="flex items-center gap-1.5"><MapPin :size="13" class="text-peach" />最佳赏鉴地点：<strong>{{ bloom.bestSpot }}</strong></span>
        <span>代表节气：{{ bloom.solarTerms.join('、') }}</span>
      </div>
    </DetailModal>

    <!-- 全年花期日历弹窗 -->
    <DetailModal
      v-if="showCalendar"
      title="一年花事，慢慢相逢"
      subtitle="FLOWERING CALENDAR · 全年物候指南"
      class="collection-modal"
      @close="showCalendar = false"
    >
      <!-- 搜索框 -->
      <div class="modal-search-row">
        <div class="search-input-box">
          <Search :size="14" class="text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索花名、节气、物候特征或寻芳地点..."
            class="attraction-search-input"
          />
        </div>
      </div>

      <div class="filter-pills month-filter">
        <button
          v-for="m in 12"
          :key="m"
          :class="{ active: month === m && !searchQuery }"
          :aria-pressed="month === m && !searchQuery"
          @click="month = m; searchQuery = ''"
        >
          {{ m }} 月
        </button>
      </div>

      <div v-if="!filteredBlooms.length" class="p-8 text-center text-sm text-slate-400">
        未找到匹配的花信物候，试着换个词搜搜看
      </div>

      <div v-else class="bloom-list">
        <article
          v-for="item in filteredBlooms"
          :key="item.name"
          class="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 transition flex items-stretch"
        >
          <BotanicalIcon :name="item.name" :color="item.color" class="shrink-0 mr-3" />
          <div class="bloom-body flex-1 min-w-0 flex flex-col h-full">
            <div class="flex items-center justify-between">
              <h3>
                {{ item.name }}
                <span class="pill peach">{{ item.status }}</span>
              </h3>
              <button
                class="set-featured-btn"
                :class="{ active: (activeBloomName || bloom.name) === item.name }"
                @click.stop="selectBloomItem(item)"
              >
                <span>{{ (activeBloomName || bloom.name) === item.name ? '✓ 当前花信' : '设为当前花信' }}</span>
              </button>
            </div>
            <p>{{ item.description }}</p>
            <p class="observation-text">{{ item.observation }}</p>
            <div class="bloom-footer-row flex items-center justify-between mt-auto pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
              <small><MapPin :size="12" />{{ item.bestSpot }} · {{ monthRange(item.months) }}</small>
            </div>
          </div>
        </article>
      </div>
      <p class="content-footnote">参考中国温带及江南常见物候；实际花期随城市、品种与当年天气变化，出行前可查看当地公园公告。</p>
    </DetailModal>
  </article>
</template>
