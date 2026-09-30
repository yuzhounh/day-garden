<script setup lang="ts">
import { ref, computed } from 'vue'
import { Flower2, MapPin, ArrowUpRight, Eye } from 'lucide-vue-next'
import type { SeasonBloom } from '../types'
import DetailModal from './DetailModal.vue'
import BotanicalArt from './BotanicalArt.vue'
import rawSeasons from '../data/seasons-bloom.json'

defineProps<{ bloom: SeasonBloom }>()
const showCalendar = ref(false)
const month = ref(new Date().getMonth() + 1)
const list = rawSeasons as SeasonBloom[]
const monthBlooms = computed(() => list.filter(item => item.months.includes(month.value)))
function monthRange(months: number[]) { return months[0] + '—' + (months[0]! > months[months.length - 1]! ? '次年 ' : '') + months[months.length - 1] + ' 月' }
</script>

<template>
  <article id="seasonal" class="glass-panel dashboard-card seasonal-card">
    <header class="card-heading"><div class="section-label"><span class="icon-tile peach"><Flower2 :size="17" /></span><h2>四时花信</h2><span class="eyebrow">IN SEASON</span></div><span class="pill peach"><span class="status-dot"></span>{{ bloom.status }}</span></header>
    <div class="bloom-scene">
      <div class="bloom-copy"><p class="eyebrow">{{ monthRange(bloom.months) }} · {{ bloom.solarTerms.join(' / ') }}</p><h3>{{ bloom.name }}</h3><p>{{ bloom.description }}</p></div>
      <BotanicalArt :name="bloom.name" :color="bloom.color" />
    </div>
    <div class="bloom-observation"><Eye :size="15" /><p>{{ bloom.observation }}</p></div>
    <footer class="card-footer"><span class="bloom-location"><MapPin :size="13" />{{ bloom.bestSpot }}</span><button class="text-button" @click="showCalendar = true">花期日历<ArrowUpRight :size="14" /></button></footer>
    <DetailModal v-if="showCalendar" title="一年花事，慢慢相逢" subtitle="FLOWERING CALENDAR · 全年物候指南" @close="showCalendar = false">
      <div class="filter-pills month-filter"><button v-for="m in 12" :key="m" :class="{ active: month === m }" :aria-pressed="month === m" @click="month = m">{{ m }} 月</button></div>
      <div class="bloom-list"><article v-for="item in monthBlooms" :key="item.name"><span class="bloom-emoji">{{ item.icon }}</span><div><h3>{{ item.name }}<span class="pill peach">{{ item.status }}</span></h3><p>{{ item.description }}</p><p class="observation-text">{{ item.observation }}</p><small><MapPin :size="12" />{{ item.bestSpot }} · {{ monthRange(item.months) }}</small></div></article></div>
      <p class="content-footnote">参考中国温带及江南常见物候；实际花期随城市、品种与当年天气变化，出行前可查看当地公园公告。</p>
    </DetailModal>
  </article>
</template>
