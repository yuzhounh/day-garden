<script setup lang="ts">
import { ref, onMounted, onUnmounted, useId } from 'vue'
import { X } from 'lucide-vue-next'
defineOptions({ inheritAttrs: false })

defineProps<{ title: string; subtitle?: string }>()
const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)
const titleId = useId()
let previousFocus: HTMLElement | null = null
let previousOverflow = ''

function handleKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
  if (event.key !== 'Tab' || !panel.value) return
  const items = [...panel.value.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]')].filter(el => el.getClientRects().length)
  const first = items[0]
  const last = items[items.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}

onMounted(() => {
  previousFocus = document.activeElement as HTMLElement
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', handleKey)
  panel.value?.focus()
})
onUnmounted(() => {
  document.body.style.overflow = previousOverflow
  document.removeEventListener('keydown', handleKey)
  previousFocus?.focus()
})
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <section ref="panel" class="detail-modal glass-panel focus:outline-none" :class="$attrs.class" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1">
        <header class="modal-heading">
          <div class="min-w-0 flex-1">
            <p v-if="subtitle" class="eyebrow truncate">{{ subtitle }}</p>
            <h2 :id="titleId" class="truncate">{{ title }}</h2>
          </div>
          <div class="modal-header-actions">
            <slot name="actions" />
            <button class="icon-button" aria-label="关闭" title="关闭" @click="emit('close')"><X :size="18" /></button>
          </div>
        </header>
        <div class="modal-content"><slot /></div>
      </section>
    </div>
  </Teleport>
</template>
