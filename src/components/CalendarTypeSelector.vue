<script setup lang="ts">
import { useId } from 'vue'

const isLunar = defineModel<boolean>({ required: true })
const groupName = useId()
</script>

<template>
  <div
    role="radiogroup"
    aria-label="历法"
    class="inline-flex shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-900/60 text-xs"
  >
    <label class="cursor-pointer">
      <input v-model="isLunar" type="radio" :name="groupName" :value="false" class="sr-only peer" />
      <span class="block px-2 py-0.5 rounded-md text-slate-500 peer-checked:bg-white dark:peer-checked:bg-slate-800 peer-checked:text-emerald-700 dark:peer-checked:text-emerald-400 peer-checked:font-medium peer-checked:shadow-xs peer-focus-visible:outline-2 peer-focus-visible:outline-emerald-500">公历</span>
    </label>
    <label class="cursor-pointer">
      <input v-model="isLunar" type="radio" :name="groupName" :value="true" class="sr-only peer" />
      <span class="block px-2 py-0.5 rounded-md text-slate-500 peer-checked:bg-white dark:peer-checked:bg-slate-800 peer-checked:text-emerald-700 dark:peer-checked:text-emerald-400 peer-checked:font-medium peer-checked:shadow-xs peer-focus-visible:outline-2 peer-focus-visible:outline-emerald-500">农历</span>
    </label>
  </div>
</template>

<style scoped>
label, label > span { min-height: 40px; min-width: 40px; display: flex; align-items: center; justify-content: center; }
</style>
