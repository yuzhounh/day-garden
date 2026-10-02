<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  PenLine,
  Send,
  Trash2,
  Copy,
  Check,
  BookOpen,
  Search,
  Sparkles,
  Download,
  Feather,
  Clock,
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
const selectedTag = ref('随想')
const showModal = ref(false)
const searchQuery = ref('')
const filterTag = ref('全部')
const copiedId = ref<string | null>(null)
const copiedAll = ref(false)

const AVAILABLE_TAGS = [
  { name: '随想', icon: '🍃', style: 'sage' },
  { name: '灵感', icon: '💡', style: 'sky' },
  { name: '确幸', icon: '✨', style: 'peach' },
  { name: '感悟', icon: '💭', style: 'lavender' },
  { name: '备忘', icon: '📌', style: 'emerald' },
  { name: '闲思', icon: '☕', style: 'amber' },
]

function getTagInfo(tagName?: string) {
  return AVAILABLE_TAGS.find(t => t.name === tagName) || AVAILABLE_TAGS[0]
}

function submitNote() {
  const text = draft.value.trim()
  if (!text) return

  const newNote: QuickNote = {
    id: 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    content: text,
    tag: selectedTag.value,
    createdAt: new Date().toISOString(),
  }

  notes.value = [newNote, ...notes.value]
  saveQuickNotes(notes.value, account.user?.id)
  draft.value = ''
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
    .map(n => `【${n.tag || '随想'} · ${formatDateTime(n.createdAt)}】\n${n.content}`)
    .join('\n\n')

  navigator.clipboard.writeText(text).then(() => {
    copiedAll.value = true
    setTimeout(() => { copiedAll.value = false }, 2000)
  }).catch(() => {})
}

function exportNotes() {
  if (!notes.value.length) return
  const text = `# Day Garden · 拾光随想便签\n导出于：${new Date().toLocaleString('zh-CN')}\n\n` +
    notes.value
      .map(n => `### ${n.tag || '随想'} · ${formatDateTime(n.createdAt)}\n\n${n.content}`)
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
  return notes.value.filter(n => {
    if (filterTag.value !== '全部' && n.tag !== filterTag.value) {
      return false
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      const matchContent = n.content.toLowerCase().includes(q)
      const matchTag = (n.tag || '').toLowerCase().includes(q)
      if (!matchContent && !matchTag) return false
    }
    return true
  })
})

const recentNotes = computed(() => {
  return notes.value.slice(0, 2)
})
</script>

<template>
  <article class="glass-panel dashboard-card quick-note-card">
    <header class="card-heading">
      <div class="section-label">
        <span class="icon-tile amber"><PenLine :size="16" /></span>
        <h2>片刻随想</h2>
        <span class="eyebrow">MOMENTS</span>
      </div>
      <button
        class="icon-button small"
        aria-label="查看全部随笔"
        title="查看全部随笔"
        @click="showModal = true"
      >
        <BookOpen :size="15" />
      </button>
    </header>

    <!-- 卡片主体内容 -->
    <div class="note-card-body">
      <!-- 快捷输入区域 -->
      <div class="quick-input-box">
        <textarea
          v-model="draft"
          rows="2"
          class="note-textarea"
          placeholder="简单记一笔此刻的所思所想、灵感或心境... (Ctrl+Enter 快速记录)"
          @keydown="handleKeydown"
        ></textarea>

        <div class="quick-input-bar">
          <!-- 标签快速选择 -->
          <div class="tag-selector-row">
            <button
              v-for="t in AVAILABLE_TAGS"
              :key="t.name"
              type="button"
              class="tag-selector-btn"
              :class="{ active: selectedTag === t.name }"
              @click="selectedTag = t.name"
            >
              <span>{{ t.icon }}</span>
              <span>{{ t.name }}</span>
            </button>
          </div>

          <!-- 提交按钮 -->
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

      <!-- 最近随想流 -->
      <div class="recent-notes-container">
        <div v-if="recentNotes.length" class="recent-notes-list">
          <div
            v-for="item in recentNotes"
            :key="item.id"
            class="recent-note-item group"
          >
            <div class="note-item-header">
              <div class="flex items-center gap-1.5">
                <span class="pill mini" :class="getTagInfo(item.tag).style">
                  {{ getTagInfo(item.tag).icon }} {{ item.tag || '随想' }}
                </span>
                <span class="note-time-label">
                  <Clock :size="11" />
                  {{ formatRelativeTime(item.createdAt) }}
                </span>
              </div>
              <div class="note-actions">
                <button
                  type="button"
                  class="note-action-btn"
                  :title="copiedId === item.id ? '已复制' : '复制内容'"
                  @click="copyNoteText(item)"
                >
                  <Check v-if="copiedId === item.id" :size="12" class="text-emerald-500" />
                  <Copy v-else :size="12" />
                </button>
                <button
                  type="button"
                  class="note-action-btn delete"
                  title="删除此笔"
                  @click="deleteNote(item.id)"
                >
                  <Trash2 :size="12" />
                </button>
              </div>
            </div>
            <p class="note-content-preview" @click="showModal = true">
              {{ item.content }}
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
        <BookOpen :size="14" />全部随想 ({{ notes.length }})
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
          class="soft-button"
          :disabled="!notes.length"
          title="复制所有随想文本"
          @click="copyAllNotes"
        >
          <Check v-if="copiedAll" :size="14" class="text-emerald-500" />
          <Copy v-else :size="14" />
          <span>{{ copiedAll ? '已复制全部' : '复制全部' }}</span>
        </button>
        <button
          type="button"
          class="soft-button"
          :disabled="!notes.length"
          title="导出为 Markdown 笔记文件"
          @click="exportNotes"
        >
          <Download :size="14" />
          <span>导出 Markdown</span>
        </button>
      </template>

      <!-- 弹窗内部快捷记录 -->
      <div class="modal-input-wrap">
        <textarea
          v-model="draft"
          rows="2"
          class="modal-textarea"
          placeholder="记下此时此刻的新想法... (Ctrl+Enter 记录)"
          @keydown="handleKeydown"
        ></textarea>
        <div class="modal-input-footer">
          <div class="tag-selector-row">
            <button
              v-for="t in AVAILABLE_TAGS"
              :key="'modal-' + t.name"
              type="button"
              class="tag-selector-btn"
              :class="{ active: selectedTag === t.name }"
              @click="selectedTag = t.name"
            >
              <span>{{ t.icon }}</span>
              <span>{{ t.name }}</span>
            </button>
          </div>
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

      <!-- 搜索与分类筛选 -->
      <div class="modal-search-row">
        <div class="search-input-wrap">
          <Search :size="15" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索随笔内容或标签..."
            class="modal-search-input"
          />
        </div>
      </div>

      <div class="filter-pills">
        <button
          type="button"
          :class="{ active: filterTag === '全部' }"
          @click="filterTag = '全部'"
        >
          全部 ({{ notes.length }})
        </button>
        <button
          v-for="t in AVAILABLE_TAGS"
          :key="'filter-' + t.name"
          type="button"
          :class="{ active: filterTag === t.name }"
          @click="filterTag = t.name"
        >
          {{ t.icon }} {{ t.name }}
        </button>
      </div>

      <!-- 随笔卡片列表 -->
      <div class="notes-modal-grid">
        <div
          v-for="item in filteredNotes"
          :key="'modal-item-' + item.id"
          class="modal-note-card"
        >
          <div class="modal-note-top">
            <div class="flex items-center gap-2">
              <span class="pill mini" :class="getTagInfo(item.tag).style">
                {{ getTagInfo(item.tag).icon }} {{ item.tag || '随想' }}
              </span>
              <span class="text-xs text-slate-400 font-mono">
                {{ formatDateTime(item.createdAt) }}
              </span>
            </div>
            <div class="flex items-center gap-1">
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

        <div v-if="!filteredNotes.length" class="modal-empty-box">
          <Sparkles :size="24" class="text-slate-400 mb-2" />
          <p class="text-sm text-slate-500">未找到匹配的随想记录。</p>
        </div>
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
}

/* 快捷输入框容器 */
.quick-input-box {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 12px 8px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.quick-input-box:focus-within {
  border-color: rgba(68, 107, 78, 0.45);
  box-shadow: 0 2px 8px rgba(68, 107, 78, 0.08);
}

.note-textarea {
  width: 100%;
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

.tag-selector-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.tag-selector-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted);
  font-size: 11.5px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.tag-selector-btn:hover {
  background: var(--sage-bg);
  color: var(--accent);
}

.tag-selector-btn.active {
  background: var(--sage-bg);
  color: var(--accent);
  border-color: rgba(68, 107, 78, 0.25);
  font-weight: 500;
}

.note-submit-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
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
  display: flex;
  flex-direction: column;
}

.recent-notes-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.recent-note-item {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 13px;
  padding: 10px 12px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 6px;
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
}

.note-time-label {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--muted);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.note-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.recent-note-item:hover .note-actions {
  opacity: 1;
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

.note-action-btn:hover {
  background: var(--sage-bg);
  color: var(--ink);
}

.note-action-btn.delete:hover {
  background: var(--peach-bg);
  color: #b18083;
}

.note-content-preview {
  font-size: 13.5px;
  color: var(--ink);
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  white-space: pre-wrap;
  cursor: pointer;
}

.note-content-preview:hover {
  color: var(--accent);
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
  margin-bottom: 18px;
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
  flex-wrap: wrap;
}

.notes-modal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
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

.modal-empty-box {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
