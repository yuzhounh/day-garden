<script setup lang="ts">
import { CalendarDays, Cake, Gift, Heart, Plus, ArrowUpRight } from 'lucide-vue-next'
import type { LifeEvent } from '../types'
defineProps<{ events: LifeEvent[] }>()
const emit = defineEmits<{ 'add-event': [] }>()
</script>

<template>
  <article class="glass-panel dashboard-card upcoming-card">
    <header class="card-heading"><div class="section-label"><span class="icon-tile sky"><CalendarDays :size="17" /></span><h2>值得记住的日子</h2></div><button class="icon-button small" aria-label="添加记事" @click="emit('add-event')"><Plus :size="16" /></button></header>
    <div v-if="!events.length" class="event-empty"><CalendarDays :size="28" :stroke-width="1" /><p>未来 30 天，留白也是好时光。</p><button class="text-button" @click="emit('add-event')">记下一个重要日子<Plus :size="14" /></button></div>
    <div v-else class="event-list"><div v-for="event in events.slice(0, 3)" :key="event.id" class="event-row">
      <span class="event-icon" :class="event.type"><Cake v-if="event.type === 'birthday'" :size="17" /><Heart v-else-if="event.type === 'anniversary'" :size="17" /><Gift v-else :size="17" /></span>
      <div class="event-info"><h3>{{ event.title }}</h3><p>{{ event.nextDateStr }}<span v-if="event.giftAdvice"> · {{ event.giftAdvice }}</span></p></div>
      <span class="event-count" :class="{ near: (event.daysLeft ?? 31) <= 3 }"><strong>{{ event.daysLeft === 0 ? '今' : event.daysLeft }}</strong><small>{{ event.daysLeft === 0 ? '天' : '天后' }}</small></span>
    </div></div>
    <footer class="card-footer"><span class="muted">未来 30 天 · {{ events.length }} 个日子</span><button class="text-button" @click="emit('add-event')">管理日程<ArrowUpRight :size="14" /></button></footer>
  </article>
</template>
