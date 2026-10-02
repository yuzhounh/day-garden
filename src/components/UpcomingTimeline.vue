<script setup lang="ts">
import { Cake, Gift, Heart, Plus, BookOpen } from 'lucide-vue-next'
import type { LifeEvent } from '../types'
import { isRedundantMemo } from '../services/calendar'
defineProps<{ events: LifeEvent[] }>()
const emit = defineEmits<{
  (e: 'add-event'): void
  (e: 'manage-events'): void
}>()
</script>

<template>
  <article class="glass-panel dashboard-card upcoming-card">
    <header class="card-heading">
      <div class="section-label">
        <span class="icon-tile sky"><Heart :size="17" /></span>
        <h2>纪念日与重要日子</h2>
        <span class="eyebrow">MILESTONES</span>
      </div>
      <button class="icon-button small" aria-label="添加纪念日" @click="emit('add-event')">
        <Plus :size="16" />
      </button>
    </header>
    <div v-if="!events.length" class="event-empty">
      <Heart :size="28" :stroke-width="1" />
      <p>暂无临近的纪念日，记下那些温暖的时刻。</p>
      <button class="text-button" @click="emit('add-event')">
        记下一个纪念日<Plus :size="14" />
      </button>
    </div>
    <div v-else class="event-list">
      <div v-for="event in events.slice(0, 4)" :key="event.id" class="event-row">
        <span class="event-icon" :class="event.type">
          <Cake v-if="event.type === 'birthday'" :size="17" />
          <Heart v-else-if="event.type === 'anniversary'" :size="17" />
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
      <button class="text-button" type="button" @click="emit('manage-events'); emit('add-event')">
        <BookOpen :size="14" />管理纪念日
      </button>
      <span class="muted">未来 30 天 · {{ events.length }} 个日子</span>
    </footer>
  </article>
</template>
