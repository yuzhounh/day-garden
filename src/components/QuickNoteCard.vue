<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  PenLine,
  Send,
  Trash2,
  Copy,
  Check,
  BookOpen,
  Search,
  Download,
  Feather,
  Clock,
  Plus,
} from 'lucide-vue-next'
import type { QuickNote } from '../types'
import DetailModal from './DetailModal.vue'
import { loadQuickNotes, saveQuickNotes } from '../services/storage'
import { account } from '../services/sync'

const notes = ref<QuickNote[]>(loadQuickNotes(account.user?.id))

watch(() => account.user?.id, (uid) => {
  notes.value = loadQuickNotes(uid)
})

const draft = ref('')
const showModal = ref(false)
const showModalInput = ref(false)
const modalTextareaRef = ref<HTMLTextAreaElement | null>(null)
const searchQuery = ref('')
const copiedId = ref<string | null>(null)
const copiedAll = ref(false)

function toggleModalInput() {
  showModalInput.value = !showModalInput.value
  if (showModalInput.value) {
    nextTick(() => {
      modalTextareaRef.value?.focus()
    })
  }
}

watch(showModal, (val) => {
  if (!val) {
    showModalInput.value = false
  }
})

function submitNote() {
  const text = draft.value.trim()
  if (!text) return

  const newNote: QuickNote = {
    id: 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    content: text,
    createdAt: new Date().toISOString(),
  }

  notes.value = [newNote, ...notes.value]
  saveQuickNotes(notes.value, account.user?.id)
  draft.value = ''
  showModalInput.value = false
  nextTick(updateVisibleCount)
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    submitNote()
  }
}

function deleteNote(id: string) {
  notes.value = notes.value.filter(n => n.id !== id)
  saveQuickNotes(notes.value, account.user?.id)
  nextTick(updateVisibleCount)
}

function copyNoteText(note: QuickNote) {
  navigator.clipboard.writeText(note.content).then(() => {
    copiedId.value = note.id
    setTimeout(() => {
      if (copiedId.value === note.id) copiedId.value = null
    }, 2000)
  }).catch(() => {})
}

function copyAllNotes() {
  if (!notes.value.length) return
  const text = notes.value
    .map(n => `【${formatDateTime(n.createdAt)}】\n${n.content}`)
    .join('\n\n')

  navigator.clipboard.writeText(text).then(() => {
    copiedAll.value = true
    setTimeout(() => { copiedAll.value = false }, 2000)
  }).catch(() => {})
}

function exportNotes() {
  if (!notes.value.length) return
  const text = `# Day Garden · 拾光随笔\n导出于：${new Date().toLocaleString('zh-CN')}\n\n` +
    notes.value
      .map(n => `### ${formatDateTime(n.createdAt)}\n\n${n.content}`)
      .join('\n\n---\n\n')

  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `day-garden-notes-${new Date().toISOString().slice(0, 10)}.md`
  a.click()
  URL.revokeObjectURL(url)
}

function formatRelativeTime(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return '刚刚'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}分钟前`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24 && now.getDate() === d.getDate()) {
      return `今天 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    const isYesterday = (new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toDateString() === new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString())
    if (isYesterday) {
      return `昨天 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hour}:${min}`
  } catch {
    return '此前'
  }
}

function formatDateTime(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${day} ${h}:${min}`
  } catch {
    return isoStr
  }
}

const filteredNotes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return notes.value
  return notes.value.filter(n => n.content.toLowerCase().includes(q))
})

const notesContainerRef = ref<HTMLElement | null>(null)
const visibleCount = ref(1)

const displayedNotes = computed(() => {
  return notes.value.slice(0, visibleCount.value)
})

let resizeObserver: ResizeObserver | null = null

function updateVisibleCount() {
  if (!notesContainerRef.value) return
  const availableHeight = notesContainerRef.value.clientHeight
  if (availableHeight <= 0) return

  if (!notes.value.length) {
    visibleCount.value = 0
    return
  }

  const renderedItems = notesContainerRef.value.querySelectorAll<HTMLElement>('.recent-note-item')
  const gap = 8

  if (renderedItems.length > 0) {
    const itemHeights: number[] = []
    renderedItems.forEach(el => itemHeights.push(el.offsetHeight))
    const sum = itemHeights.reduce((a, b) => a + b, 0)
    const avgHeight = Math.max(68, sum / itemHeights.length)

    let usedHeight = 0
    let count = 0

    for (let i = 0; i < notes.value.length; i++) {
      const h = i < itemHeights.length ? itemHeights[i]! : avgHeight
      const needed = count === 0 ? h : usedHeight + gap + h
      // Ensure the note completely fits with a small buffer (4px)
      if (needed <= availableHeight - 4) {
        usedHeight = needed
        count++
      } else {
        break
      }
    }

    const newCount = Math.max(1, count)
    if (visibleCount.value !== newCount) {
      visibleCount.value = newCount
    }
  } else {
    // Initial estimation
    const est = Math.max(1, Math.floor((availableHeight - 4 + gap) / (76 + gap)))
    visibleCount.value = Math.min(notes.value.length, est)
  }
}

onMounted(() => {
  if (notesContainerRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        updateVisibleCount()
      })
    })
    resizeObserver.observe(notesContainerRef.value)
  }
  nextTick(() => {
    updateVisibleCount()
  })
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

watch(
  () => notes.value.length,
  () => {
    nextTick(updateVisibleCount)
  }
)

function onAccordionEnter(el: Element) {
  const element = el as HTMLElement
  element.style.height = '0px'
  element.style.opacity = '0'
  element.style.marginTop = '0px'
  element.style.marginBottom = '0px'
  element.style.transform = 'translateY(-8px)'
  element.style.overflow = 'hidden'
  element.offsetHeight // trigger reflow
  element.style.transition = 'height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), margin 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  element.style.height = `${element.scrollHeight}px`
  element.style.marginTop = ''
  element.style.marginBottom = ''
  element.style.opacity = '1'
  element.style.transform = 'translateY(0)'
}

function onAccordionAfterEnter(el: Element) {
  const element = el as HTMLElement
  element.style.height = 'auto'
  element.style.overflow = 'visible'
  element.style.transition = ''
}

function onAccordionLeave(el: Element) {
  const element = el as HTMLElement
  element.style.height = `${element.scrollHeight}px`
  element.style.overflow = 'hidden'
  element.offsetHeight // trigger reflow
  element.style.transition = 'height 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), margin 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
  element.style.height = '0px'
  element.style.marginTop = '0px'
  element.style.marginBottom = '0px'
  element.style.opacity = '0'
  element.style.transform = 'translateY(-8px)'
}
</script>

<template>
  <article class="glass-panel dashboard-card quick-note-card">
    <header class="card-heading">
      <div class="section-label">
        <span class="icon-tile amber"><PenLine :size="16" /></span>
        <h2>片刻随想</h2>
        <span class="eyebrow">MOMENTS</span>
      </div>
    </header>

    <!-- 卡片主体内容 -->
    <div class="note-card-body">
      <!-- 快捷输入区域 -->
      <div class="quick-input-box">
        <textarea
          v-model="draft"
          rows="3"
          class="note-textarea"
          placeholder="简单记一笔此刻的所思所想、灵感或心境..."
          @keydown="handleKeydown"
        ></textarea>

        <div class="quick-input-bar">
          <span class="note-input-hint">Ctrl + Enter 记录</span>
          <button
            type="button"
            class="note-submit-btn"
            :disabled="!draft.trim()"
            @click="submitNote"
          >
            <Send :size="12" />
            <span>记一笔</span>
          </button>
        </div>
      </div>

      <!-- 自适应随想展示列表 -->
      <div ref="notesContainerRef" class="recent-notes-container">
        <div v-if="displayedNotes.length" class="recent-notes-list">
          <div
            v-for="note in displayedNotes"
            :key="note.id"
            class="recent-note-item group"
          >
            <div class="note-item-header">
              <span class="note-time-label">
                <Clock :size="11" />
                {{ formatRelativeTime(note.createdAt) }}
              </span>
              <div class="note-actions">
                <button
                  type="button"
                  class="note-action-btn"
                  :title="copiedId === note.id ? '已复制' : '复制内容'"
                  @click.stop="copyNoteText(note)"
                >
                  <Check v-if="copiedId === note.id" :size="12" class="text-emerald-500" />
                  <Copy v-else :size="12" />
                </button>
                <button
                  type="button"
                  class="note-action-btn delete"
                  title="删除此笔"
                  @click.stop="deleteNote(note.id)"
                >
                  <Trash2 :size="12" />
                </button>
              </div>
            </div>
            <p class="note-content-preview" @click="showModal = true">
              {{ note.content }}
            </p>
          </div>
        </div>

        <!-- 空状态提示 -->
        <div v-else class="note-empty-state">
          <Feather :size="22" class="empty-icon" />
          <p class="empty-title">风吹哪页读哪页，心有所感记一笔。</p>
          <span class="empty-sub">写下片刻的思绪、闪光灵感或小小确幸</span>
        </div>
      </div>
    </div>

    <!-- 卡片底部统一栏 -->
    <footer class="card-footer">
      <button class="text-button" type="button" @click="showModal = true">
        <BookOpen :size="14" />全部随想
      </button>
      <div class="inline-actions">
        <span class="muted">{{ notes.length ? '已留存 ' + notes.length + ' 抹心绪' : '随想随记' }}</span>
      </div>
    </footer>

    <!-- 全部随想与回顾弹窗 -->
    <DetailModal
      v-if="showModal"
      title="片刻随笔 · 拾光心语"
      subtitle="MOMENTS & THOUGHTS · 记录心境流转与片刻灵光"
      class="collection-modal quick-notes-modal"
      @close="showModal = false"
    >
      <template #actions>
        <button
          type="button"
          class="icon-button"
          :class="{ active: showModalInput }"
          :title="showModalInput ? '收起输入框' : '新增笔记'"
          :aria-label="showModalInput ? '收起输入框' : '新增笔记'"
          @click="toggleModalInput"
        >
          <Plus :size="18" class="plus-icon" />
        </button>
        <button
          type="button"
          class="icon-button"
          :class="{ active: copiedAll }"
          :disabled="!notes.length"
          :title="copiedAll ? '已复制全部随想' : '复制全部随想'"
          :aria-label="copiedAll ? '已复制全部随想' : '复制全部随想'"
          @click="copyAllNotes"
        >
          <Check v-if="copiedAll" :size="18" class="text-emerald-500" />
          <Copy v-else :size="18" />
        </button>
        <button
          type="button"
          class="icon-button"
          :disabled="!notes.length"
          title="导出为 Markdown 文件"
          aria-label="导出为 Markdown 文件"
          @click="exportNotes"
        >
          <Download :size="18" />
        </button>
      </template>

      <!-- 弹窗内部快捷记录 (默认隐藏，点击右上角“新增笔记”按钮展开) -->
      <Transition
        name="accordion"
        @enter="onAccordionEnter"
        @after-enter="onAccordionAfterEnter"
        @leave="onAccordionLeave"
      >
        <div v-if="showModalInput" class="accordion-panel">
          <div class="modal-input-wrap">
            <textarea
              ref="modalTextareaRef"
              v-model="draft"
              rows="3"
              class="modal-textarea"
              placeholder="记下此时此刻的新想法..."
              @keydown="handleKeydown"
            ></textarea>
            <div class="modal-input-footer">
              <span class="note-input-hint">Ctrl + Enter 记录</span>
              <div class="modal-input-btns">
                <button
                  type="button"
                  class="modal-cancel-btn"
                  @click="showModalInput = false"
                >
                  收起
                </button>
                <button
                  type="button"
                  class="note-submit-btn"
                  :disabled="!draft.trim()"
                  @click="submitNote"
                >
                  <Send :size="12" />
                  <span>记一笔</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 搜索框 -->
      <div class="modal-search-row">
        <div class="search-input-box">
          <Search :size="14" class="text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索随笔内容..."
            class="attraction-search-input"
          />
        </div>
      </div>

      <!-- 随笔卡片列表 -->
      <div v-if="filteredNotes.length" class="notes-modal-grid">
        <div
          v-for="item in filteredNotes"
          :key="'modal-item-' + item.id"
          class="modal-note-card"
        >
          <div class="modal-note-top">
            <span class="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <Clock :size="12" />
              {{ formatDateTime(item.createdAt) }}
            </span>
            <div class="modal-note-actions">
              <button
                type="button"
                class="note-action-btn"
                :title="copiedId === item.id ? '已复制' : '复制内容'"
                @click="copyNoteText(item)"
              >
                <Check v-if="copiedId === item.id" :size="13" class="text-emerald-500" />
                <Copy v-else :size="13" />
              </button>
              <button
                type="button"
                class="note-action-btn delete"
                title="删除此笔"
                @click="deleteNote(item.id)"
              >
                <Trash2 :size="13" />
              </button>
            </div>
          </div>
          <p class="modal-note-text">{{ item.content }}</p>
        </div>
      </div>

      <div v-else class="p-10 text-center text-sm text-slate-400">
        {{ searchQuery ? '未找到包含该关键词的随笔，试着换个词搜搜看' : '暂无随笔，在上方写下此刻的心境吧' }}
      </div>
    </DetailModal>
  </article>
</template>

<style scoped>
.quick-note-card {
  display: flex;
  flex-direction: column;
}

.note-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

/* 快捷输入框容器 */
.quick-input-box {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 12px 8px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
}

.quick-input-box:focus-within {
  border-color: rgba(68, 107, 78, 0.45);
  box-shadow: 0 2px 8px rgba(68, 107, 78, 0.08);
}

.note-textarea {
  width: 100%;
  min-height: 72px;
  border: none;
  background: transparent;
  color: var(--ink);
  font-family: "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13.5px;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.note-textarea::placeholder {
  color: var(--muted);
  font-size: 12.5px;
}

.quick-input-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px dashed var(--line);
  margin-top: 4px;
}

.note-input-hint {
  font-size: 11.5px;
  color: var(--muted);
  user-select: none;
}

.note-submit-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 11px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  font-family: inherit;
  flex-shrink: 0;
}

.note-submit-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.note-submit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 最近随想列表 */
.recent-notes-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow: hidden;
}

.recent-notes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.recent-note-item {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 13px;
  padding: 9px 12px 8px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex-shrink: 0;
  box-sizing: border-box;
}

.recent-note-item:hover {
  border-color: rgba(68, 107, 78, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.note-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  flex-shrink: 0;
}

.note-time-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--muted);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  user-select: none;
}

.note-actions,
.modal-note-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.recent-note-item:hover .note-actions,
.modal-note-card:hover .modal-note-actions {
  opacity: 1;
}

@media (hover: none) {
  .note-actions,
  .modal-note-actions {
    opacity: 1;
  }
}

.note-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

@media (max-width: 720px), (pointer: coarse) {
  .note-action-btn {
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
  }
}

.note-action-btn:hover {
  background: var(--sage-bg);
  color: var(--ink);
}

.note-action-btn.delete:hover {
  background: var(--peach-bg);
  color: #b18083;
}

.note-content-preview {
  font-size: 13px;
  color: var(--ink);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  white-space: pre-wrap;
  cursor: pointer;
}

.note-content-preview:hover {
  color: var(--accent);
}

/* 手机：卡片收紧；输入框平时两行高，输入时或有内容时展开；触屏不显示快捷键提示 */
@media (max-width: 720px) {
  .quick-note-card .card-heading { margin-bottom: 12px; }
  .note-card-body { gap: 10px; }
  .quick-input-box { padding: 8px 10px; }
  .note-textarea { height: 50px; min-height: 0; line-height: 1.5; transition: height .2s ease; }
  .note-textarea:focus,
  .note-textarea:not(:placeholder-shown) { height: 92px; }
  .quick-input-bar { justify-content: flex-end; padding-top: 5px; margin-top: 2px; }
  .note-input-hint { display: none; }
  .note-submit-btn { min-height: 32px; padding: 0 13px; }
  .recent-notes-list { gap: 6px; }
  .recent-note-item { padding: 4px 4px 8px 12px; gap: 0; }
  .note-action-btn { width: 32px; height: 32px; min-width: 32px; min-height: 32px; }
  .note-empty-state { padding: 14px 12px; }
  .quick-note-card .card-footer { padding: 10px 0 16px; }
}

/* 空状态 */
.note-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 22px 14px;
  background: var(--sage-bg);
  border-radius: 14px;
  border: 1px dashed var(--line);
  margin-top: auto;
  margin-bottom: auto;
}

.empty-icon {
  color: var(--accent);
  margin-bottom: 8px;
  opacity: 0.8;
}

.empty-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  margin: 0 0 4px;
  line-height: 1.5;
}

.empty-sub {
  font-size: 11.5px;
  color: var(--muted);
}

/* 弹窗特有样式 */
.modal-input-wrap {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
}

.modal-textarea {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--ink);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  min-height: 60px;
}

.modal-input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
  margin-top: 8px;
  gap: 10px;
}

.modal-input-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-cancel-btn {
  font-size: 12.5px;
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--line);
  padding: 5px 12px;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-cancel-btn:hover {
  color: var(--ink);
  background: var(--surface);
  border-color: rgba(68, 107, 78, 0.3);
}

.accordion-panel {
  will-change: height, opacity, transform;
}

.icon-button {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.icon-button .plus-icon {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.icon-button.active .plus-icon {
  transform: rotate(45deg);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.notes-modal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
  max-height: 540px;
  overflow-y: auto;
}

@media (max-width: 680px) {
  .notes-modal-grid {
    grid-template-columns: 1fr;
  }
}

.modal-note-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s ease;
}

.modal-note-card:hover {
  border-color: rgba(68, 107, 78, 0.4);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
}

.modal-note-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.modal-note-text {
  font-size: 14px;
  color: var(--ink);
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
