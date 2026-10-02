import { computed, onMounted, onUnmounted, shallowRef } from 'vue'

/** A local calendar date, shared by daily content, weather and habit tracking. */
export function localDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export const currentTime = shallowRef(new Date())
export const currentDate = computed(() => localDateKey(currentTime.value))
let subscribers = 0
let timer: ReturnType<typeof setInterval> | undefined
export function updateCurrentTime(date = new Date()) { currentTime.value = date }
function resumeClock() { if (!document.hidden) updateCurrentTime() }

export function useCurrentTime() {
  onMounted(() => {
    if (subscribers++ === 0) {
      updateCurrentTime()
      timer = setInterval(updateCurrentTime, 30000)
      document.addEventListener('visibilitychange', resumeClock)
    }
  })
  onUnmounted(() => {
    if (--subscribers === 0) {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', resumeClock)
    }
  })
  return currentTime
}
