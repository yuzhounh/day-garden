<script setup lang="ts">
import { ref } from 'vue'
import { Cake, Gift, Heart, Plus, BookOpen, CalendarCheck } from 'lucide-vue-next'
import type { LifeEvent } from '../types'
import { isRedundantMemo, getEventCategory } from '../services/calendar'
import EventsModal from './EventsModal.vue'

defineProps<{
  events: LifeEvent[]
  customEvents: LifeEvent[]
}>()

const emit = defineEmits<{
  (e: 'update:customEvents', events: LifeEvent[]): void
}>()

const showModal = ref(false)

function openModal() {
  showModal.value = true
}
</script>

<template>
  <article class="glass-panel dashboard-card upcoming-card">
    <header class="card-heading">
      <div class="section-label">
        <span class="icon-tile sky"><Heart :size="17" /></span>
        <h2>岁月里程</h2>
        <span class="eyebrow">MILESTONES</span>
      </div>
      <button class="icon-button small" aria-label="添加重要日子与日程" @click="openModal">
        <Plus :size="16" />
      </button>
    </header>

    <div v-if="!events.length" class="event-empty">
      <Heart :size="28" :stroke-width="1" />
      <p>暂无临近的日子或日程，记下那些温暖时刻与重要安排。</p>
      <button class="text-button" @click="openModal">
        记下一个日子或日程<Plus :size="14" />
      </button>
    </div>

    <div v-else class="event-list">
      <div v-for="event in events.slice(0, 4)" :key="event.id" class="event-row">
        <span class="event-icon" :class="getEventCategory(event)">
          <CalendarCheck v-if="getEventCategory(event) === 'schedule'" :size="17" />
          <Heart v-else-if="getEventCategory(event) === 'anniversary'" :size="17" />
          <Cake v-else-if="getEventCategory(event) === 'birthday'" :size="17" />
          <Gift v-else :size="17" />
        </span>
        <div class="event-info">
          <h3>{{ event.title }}</h3>
          <p>{{ event.nextDateStr }}<span v-if="event.giftAdvice && !isRedundantMemo(event.giftAdvice)"> · {{ event.giftAdvice }}</span></p>
        </div>
        <span class="event-count" :class="{ near: (event.daysLeft ?? 31) <= 3 }">
          <strong>{{ event.daysLeft === 0 ? '今' : event.daysLeft }}</strong>
          <small>{{ event.daysLeft === 0 ? '天' : '天后' }}</small>
        </span>
      </div>
    </div>

    <footer class="card-footer">
      <button class="text-button" type="button" @click="openModal">
        <BookOpen :size="14" />管理重要日子与日程
      </button>
      <span class="muted">未来 30 天 · {{ events.length }} 项</span>
    </footer>

    <!-- 独立的日子与日程管理弹窗 -->
    <EventsModal
      v-if="showModal"
      :custom-events="customEvents"
      @close="showModal = false"
      @update:custom-events="emit('update:customEvents', $event)"
    />
  </article>
</template>
