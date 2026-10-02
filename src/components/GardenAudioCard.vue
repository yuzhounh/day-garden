<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Headphones,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Volume2,
  VolumeX,
  Clock,
  CloudRain,
  Waves,
  Wind,
  Bell,
  Coffee,
  Sparkles,
  SunMedium,
} from 'lucide-vue-next'
import {
  currentTrack,
  audioState,
  togglePlay,
  prevTrack,
  nextTrack,
  randomTrack,
  setVolume,
  toggleMute,
  setSleepTimer,
} from '../services/audio'

const showVolumeBar = ref(false)
const volumeWrapRef = ref<HTMLElement | null>(null)

const isDraggingCardVol = ref(false)
let cardVolDragTimer: number | null = null

const cardVolumePercent = computed(() => {
  return audioState.isMuted ? 0 : audioState.volume
})

const cardVolumeTooltipLeft = computed(() => {
  const pct = cardVolumePercent.value
  const offset = 7 - 14 * (pct / 100)
  const sign = offset >= 0 ? '+' : '-'
  return `calc(${pct}% ${sign} ${Math.abs(offset).toFixed(1)}px)`
})

function onCardVolInput(e: Event) {
  const val = Number((e.target as HTMLInputElement).value)
  setVolume(val)
  isDraggingCardVol.value = true
  if (cardVolDragTimer) clearTimeout(cardVolDragTimer)
  cardVolDragTimer = window.setTimeout(() => {
    isDraggingCardVol.value = false
  }, 1000)
}

function onCardVolPointerDown() {
  isDraggingCardVol.value = true
}

function onCardVolPointerUp() {
  if (cardVolDragTimer) clearTimeout(cardVolDragTimer)
  cardVolDragTimer = window.setTimeout(() => {
    isDraggingCardVol.value = false
  }, 600)
}

const timerPills = [
  { label: '不限时', val: 0 },
  { label: '15分', val: 15 },
  { label: '30分', val: 30 },
  { label: '60分', val: 60 },
]

function formatRemainingTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function closeVolumeBar(event: MouseEvent) {
  if (!volumeWrapRef.value?.contains(event.target as Node)) {
    showVolumeBar.value = false
    isDraggingCardVol.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeVolumeBar)
})

onUnmounted(() => {
  document.removeEventListener('click', closeVolumeBar)
})
</script>

<template>
  <article class="glass-panel dashboard-card garden-audio-card" aria-label="听见花园音频播放卡片">
    <header class="card-heading">
      <div class="section-label">
        <span class="icon-tile sage"><Headphones :size="16" /></span>
        <h2>听见花园</h2>
        <span class="eyebrow">SOUNDS OF GARDEN</span>
      </div>
      <div class="audio-head-actions">
        <span v-if="audioState.sleepTimerRemaining > 0" class="timer-badge">
          <Clock :size="12" />
          <span>{{ formatRemainingTime(audioState.sleepTimerRemaining) }}</span>
        </span>
      </div>
    </header>

    <div class="audio-card-body">
      <!-- 胶片唱盘与声景信息展示区域（垂直居中） -->
      <div class="audio-vinyl-stage">
        <!-- 左侧：黑胶唱片（播放时持续慢速优雅旋转，暂停时停止） -->
        <div class="vinyl-record-wrap">
          <div class="vinyl-disc" :class="{ spinning: audioState.isPlaying }">
            <div class="vinyl-groove-ring ring-1"></div>
            <div class="vinyl-groove-ring ring-2"></div>
            <div class="vinyl-groove-ring ring-3"></div>
            <div class="vinyl-groove-ring ring-4"></div>
            <div class="vinyl-center-label">
              <div class="vinyl-icon-inner">
                <CloudRain v-if="currentTrack.icon === 'CloudRain'" :size="24" />
                <Waves v-else-if="currentTrack.icon === 'Waves'" :size="24" />
                <Wind v-else-if="currentTrack.icon === 'Wind'" :size="24" />
                <Bell v-else-if="currentTrack.icon === 'Bell'" :size="24" />
                <Coffee v-else-if="currentTrack.icon === 'Coffee'" :size="24" />
                <Sparkles v-else-if="currentTrack.icon === 'Sparkles'" :size="24" />
                <SunMedium v-else :size="24" />
              </div>
            </div>
          </div>
        </div>

        <!-- 中间：展示音乐名、标签与副标题 -->
        <div class="vinyl-meta-right">
          <div class="vinyl-tag-row">
            <span class="track-tag">{{ currentTrack.category === 'nature' ? '自然白噪音' : '舒缓轻电台' }}</span>
          </div>
          <h3 class="vinyl-track-title">{{ currentTrack.name }}</h3>
          <p class="vinyl-track-sub">{{ currentTrack.subtitle }}</p>
        </div>

        <!-- 右侧：与黑胶唱片垂直居中对齐的律动竖线 -->
        <div class="sound-wave-bars" :class="{ playing: audioState.isPlaying }" aria-hidden="true">
          <span class="bar bar-1"></span>
          <span class="bar bar-2"></span>
          <span class="bar bar-3"></span>
          <span class="bar bar-4"></span>
          <span class="bar bar-5"></span>
          <span class="bar bar-6"></span>
        </div>
      </div>

      <!-- 控制器：有边框与背景的圆角胶囊框，与上面小卡片完全一致 -->
      <div class="audio-controls-row">
        <!-- 左侧：随机切换按钮 -->
        <div class="controls-left">
          <button
            type="button"
            class="ctrl-icon-btn random-btn"
            title="随机切换"
            aria-label="随机切换"
            @click="randomTrack"
          >
            <Shuffle :size="16" />
          </button>
        </div>

        <!-- 中间：后退、播放/暂停、前进三个按键居中显示 -->
        <div class="controls-center">
          <button
            type="button"
            class="ctrl-icon-btn"
            title="上一首"
            aria-label="上一首"
            @click="prevTrack"
          >
            <SkipBack :size="16" />
          </button>

          <button
            type="button"
            class="play-main-btn"
            :title="audioState.isPlaying ? '暂停' : '播放'"
            :aria-label="audioState.isPlaying ? '暂停' : '播放'"
            @click="togglePlay"
          >
            <Pause v-if="audioState.isPlaying" :size="21" />
            <Play v-else :size="21" class="translate-x-0.5" />
          </button>

          <button
            type="button"
            class="ctrl-icon-btn"
            title="下一首"
            aria-label="下一首"
            @click="nextTrack"
          >
            <SkipForward :size="16" />
          </button>
        </div>

        <!-- 右侧：音量按键与弹出式调节条 -->
        <div ref="volumeWrapRef" class="controls-right volume-pop-wrapper">
          <button
            type="button"
            class="ctrl-icon-btn vol-toggle-btn"
            :class="{ 'is-active': showVolumeBar }"
            :title="showVolumeBar ? '收起音量调节' : '展开音量调节'"
            :aria-label="showVolumeBar ? '收起音量调节' : '展开音量调节'"
            @click.stop="showVolumeBar = !showVolumeBar"
          >
            <VolumeX v-if="audioState.isMuted || audioState.volume === 0" :size="16" />
            <Volume2 v-else :size="16" />
          </button>

          <!-- 点击后弹出的毛玻璃音量条浮层 -->
          <Transition name="fade-slide">
            <div v-if="showVolumeBar" class="volume-slider-popover" @click.stop>
              <button
                type="button"
                class="vol-mute-btn"
                :title="audioState.isMuted ? '取消静音' : '静音'"
                :aria-label="audioState.isMuted ? '取消静音' : '静音'"
                @click="toggleMute"
              >
                <VolumeX v-if="audioState.isMuted || audioState.volume === 0" :size="14" />
                <Volume2 v-else :size="14" />
              </button>
              <div class="volume-slider-track-wrap">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  :value="audioState.isMuted ? 0 : audioState.volume"
                  class="volume-slider"
                  aria-label="调节音量"
                  @input="onCardVolInput"
                  @pointerdown="onCardVolPointerDown"
                  @pointerup="onCardVolPointerUp"
                />
                <div
                  class="volume-thumb-tooltip"
                  :class="{ 'is-visible': isDraggingCardVol }"
                  :style="{ left: cardVolumeTooltipLeft }"
                >
                  {{ audioState.isMuted ? '0%' : audioState.volume + '%' }}
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- 卡片底部：状态显示与定时关闭 -->
    <footer class="card-footer">
      <div class="audio-footer-status">
        <span class="status-indicator-dot" :class="{ active: audioState.isPlaying }"></span>
        <span class="status-text">
          {{ audioState.isPlaying ? '正在播放 · ' + currentTrack.name : '已暂停 · 点击随时聆听' }}
        </span>
      </div>

      <!-- 定时关闭切换 -->
      <div class="sleep-timer-group">
        <span class="timer-label">定时：</span>
        <button
          v-for="p in timerPills"
          :key="p.val"
          type="button"
          class="timer-pill-btn"
          :class="{
            active: audioState.sleepTimerMinutes === p.val,
            'is-off': p.val === 0
          }"
          @click="setSleepTimer(p.val)"
        >
          {{ p.label }}
        </button>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.garden-audio-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.audio-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.timer-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 9999px;
  background: var(--sage-bg);
  color: var(--accent);
  font-size: 11px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.audio-card-body {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
  min-height: 0;
  margin-bottom: 4px;
  gap: 16px;
}

/* 胶片唱盘与音乐展示区域（在上下间隙中垂直居中） */
.audio-vinyl-stage {
  display: flex;
  align-items: center;
  gap: 26px;
  padding: 10px 8px;
  margin: auto 0;
}

/* 黑胶唱片 */
.vinyl-record-wrap {
  position: relative;
  flex-shrink: 0;
  filter: drop-shadow(0 12px 26px rgba(0, 0, 0, 0.22));
}

.vinyl-disc {
  width: 142px;
  height: 142px;
  border-radius: 50%;
  position: relative;
  display: grid;
  place-items: center;
  background:
    /* 柔和黑胶唱片沙漏型光泽反射 (Soft conic reflection) */
    conic-gradient(
      from 45deg at 50% 50%,
      rgba(255, 255, 255, 0.07) 0deg,
      transparent 55deg,
      rgba(255, 255, 255, 0.13) 90deg,
      transparent 135deg,
      rgba(255, 255, 255, 0.07) 180deg,
      transparent 235deg,
      rgba(255, 255, 255, 0.13) 270deg,
      transparent 315deg,
      rgba(255, 255, 255, 0.07) 360deg
    ),
    /* 细腻柔和微纹音轨暗纹 (Subtle micro-grooves) */
    repeating-radial-gradient(
      circle at 50% 50%,
      rgba(255, 255, 255, 0.07) 0px,
      rgba(255, 255, 255, 0.07) 1px,
      transparent 1.5px,
      transparent 4.5px
    ),
    /* 黑胶唱片本体渐变底色 */
    radial-gradient(
      circle at 50% 50%,
      #323a42 0%,
      #22272c 35%,
      #15181b 70%,
      #0b0d0f 100%
    );
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.12),
    inset 0 0 20px rgba(0, 0, 0, 0.7),
    0 10px 24px rgba(0, 0, 0, 0.22);
  animation: vinyl-spin 16s linear infinite;
  animation-play-state: paused;
}

.vinyl-disc.spinning {
  animation-play-state: running;
}

@keyframes vinyl-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.vinyl-groove-ring {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.vinyl-groove-ring.ring-1 {
  width: 126px;
  height: 126px;
  border: 1px solid rgba(255, 255, 255, 0.11);
}
.vinyl-groove-ring.ring-2 {
  width: 108px;
  height: 108px;
  border: 1px solid rgba(255, 255, 255, 0.09);
}
.vinyl-groove-ring.ring-3 {
  width: 90px;
  height: 90px;
  border: 1px solid rgba(255, 255, 255, 0.11);
}
.vinyl-groove-ring.ring-4 {
  width: 72px;
  height: 72px;
  border: 1px solid rgba(255, 255, 255, 0.09);
}

.vinyl-center-label {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--sage-bg);
  color: var(--accent);
  display: grid;
  place-items: center;
  position: relative;
  border: 1.5px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.25);
  z-index: 2;
}

.vinyl-icon-inner {
  display: grid;
  place-items: center;
}

/* 右侧信息展示 */
.vinyl-meta-right {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.vinyl-tag-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.track-tag {
  font-size: 10.5px;
  padding: 2px 7px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
  font-weight: 500;
  white-space: nowrap;
}

.vinyl-track-title {
  font-size: 21px;
  font-weight: 600;
  color: var(--ink);
  margin: 1px 0 0;
  line-height: 1.25;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vinyl-track-sub {
  font-size: 12.5px;
  color: var(--muted);
  margin: 0;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 律动音波：与黑胶唱片垂直居中对齐 */
.sound-wave-bars {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 24px;
  flex-shrink: 0;
  padding: 0 4px;
}

.sound-wave-bars .bar {
  width: 2.5px;
  height: 4px;
  border-radius: 1.5px;
  background: var(--accent);
  opacity: 0.35;
  transition: height 0.2s ease, opacity 0.2s ease;
}

.sound-wave-bars.playing .bar {
  opacity: 0.85;
  animation: soundBounce 1.2s infinite ease-in-out alternate;
}

.sound-wave-bars.playing .bar-1 { animation-delay: 0.1s; height: 10px; }
.sound-wave-bars.playing .bar-2 { animation-delay: 0.3s; height: 16px; }
.sound-wave-bars.playing .bar-3 { animation-delay: 0.15s; height: 8px; }
.sound-wave-bars.playing .bar-4 { animation-delay: 0.4s; height: 14px; }
.sound-wave-bars.playing .bar-5 { animation-delay: 0.25s; height: 7px; }
.sound-wave-bars.playing .bar-6 { animation-delay: 0.35s; height: 12px; }

@keyframes soundBounce {
  0% { transform: scaleY(0.35); }
  100% { transform: scaleY(1.3); }
}

/* 播放控制条：精简卡片高度，主播放键直径超出卡片边界 */
.audio-controls-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: 100%;
  height: 40px;
  padding: 0 14px;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--line);
  position: relative;
  overflow: visible;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.controls-left {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.controls-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  position: relative;
  z-index: 2;
}

.controls-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  position: relative;
}

.ctrl-icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ctrl-icon-btn:hover {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}

.ctrl-icon-btn.vol-toggle-btn.is-active {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
}

.play-main-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 38%, transparent);
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin: -4px 0;
}

.play-main-btn:hover {
  transform: scale(1.06);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--accent) 48%, transparent);
}

.play-main-btn:active {
  transform: scale(0.96);
}

/* 弹出式音量条浮层 */
.volume-pop-wrapper {
  position: relative;
}

.volume-slider-popover {
  position: absolute;
  bottom: calc(100% + 9px);
  right: 0;
  width: 140px;
  padding: 8px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--line);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 50;
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  overflow: visible;
}

:global(.dark) .volume-slider-popover {
  background: rgba(30, 33, 40, 0.96);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}

.vol-mute-btn {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  transition: color 0.15s ease;
}

.vol-mute-btn:hover {
  color: var(--accent);
}

.volume-slider-track-wrap {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.volume-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--line);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  margin: 0;
  display: block;
  width: 100%;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: transform 0.1s ease;
}

.volume-slider:active::-webkit-slider-thumb {
  transform: scale(1.15);
}

.volume-thumb-tooltip {
  position: absolute;
  bottom: calc(100% + 7px);
  background: var(--accent);
  color: #ffffff;
  font-size: 10px;
  font-weight: 600;
  padding: 1.5px 5.5px;
  border-radius: 5px;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translate(-50%, 3px) scale(0.92);
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.22);
  z-index: 60;
  font-variant-numeric: tabular-nums;
}

.volume-thumb-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 3.5px 3.5px 0 3.5px;
  border-style: solid;
  border-color: var(--accent) transparent transparent transparent;
}

.volume-slider-track-wrap:hover .volume-thumb-tooltip,
.volume-thumb-tooltip.is-visible {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, 0) scale(1);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* 底部状态 */
.audio-footer-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
}

.status-indicator-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted);
  transition: background 0.2s ease;
}

.status-indicator-dot.active {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.sleep-timer-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.timer-label {
  font-size: 11px;
  color: var(--muted);
}

.timer-pill-btn {
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.timer-pill-btn:hover {
  color: var(--ink);
  border-color: var(--accent);
}

.timer-pill-btn.active {
  background: var(--sage-bg);
  color: var(--accent);
  border-color: var(--accent);
  font-weight: 500;
}

.timer-pill-btn.is-off.active {
  background: color-mix(in srgb, var(--ink) 8%, transparent);
  color: var(--ink);
  border-color: color-mix(in srgb, var(--ink) 18%, transparent);
  font-weight: 500;
}

@media (max-width: 480px) {
  .audio-vinyl-stage {
    gap: 16px;
  }
  .vinyl-disc {
    width: 108px;
    height: 108px;
  }
  .vinyl-groove-ring.ring-1 { width: 96px; height: 96px; }
  .vinyl-groove-ring.ring-2 { width: 82px; height: 82px; }
  .vinyl-groove-ring.ring-3 { width: 68px; height: 68px; }
  .vinyl-groove-ring.ring-4 { width: 54px; height: 54px; }
  .vinyl-center-label {
    width: 40px;
    height: 40px;
  }
  .vinyl-track-title {
    font-size: 18px;
  }
}
</style>
