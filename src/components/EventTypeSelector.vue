<script setup lang="ts">
import { nextTick, ref } from 'vue'

type EventType = 'birthday' | 'anniversary' | 'schedule'
const selected = defineModel<EventType>({ required: true })
const panel = ref<HTMLElement | null>(null)
const choices: { value: EventType; label: string }[] = [
  { value: 'birthday', label: '🎂 生日' },
  { value: 'anniversary', label: '💖 纪念日' },
  { value: 'schedule', label: '📅 日程计划' },
]

async function move(event: KeyboardEvent) {
  const index = choices.findIndex(choice => choice.value === selected.value)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowLeft' ? 2 : 1)) % 3
  selected.value = choices[next]!.value
  await nextTick()
  panel.value?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus()
}
</script>

<template>
  <div ref="panel" role="group" aria-label="事件类型" class="inline-flex shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-900/60 text-xs"
    @keydown.left.prevent="move" @keydown.right.prevent="move" @keydown.home.prevent="move" @keydown.end.prevent="move">
    <button v-for="choice in choices" :key="choice.value" type="button" :aria-pressed="selected === choice.value" :tabindex="selected === choice.value ? 0 : -1"
      class="min-h-10 min-w-10 px-2 rounded-md transition focus-visible:outline-2 focus-visible:outline-emerald-500"
      :class="selected === choice.value ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-medium shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'"
      @click="selected = choice.value">{{ choice.label }}</button>
  </div>
</template>
