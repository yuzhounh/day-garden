<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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
      <!-- 播放器主视窗与声波律动 -->
      <div class="audio-hero-panel" :class="{ 'is-active': audioState.isPlaying }">
        <div class="audio-meta-left">
          <div class="track-icon-avatar" :class="{ pulse: audioState.isPlaying }">
            <CloudRain v-if="currentTrack.icon === 'CloudRain'" :size="22" />
            <Waves v-else-if="currentTrack.icon === 'Waves'" :size="22" />
            <Wind v-else-if="currentTrack.icon === 'Wind'" :size="22" />
            <Bell v-else-if="currentTrack.icon === 'Bell'" :size="22" />
            <Coffee v-else-if="currentTrack.icon === 'Coffee'" :size="22" />
            <Sparkles v-else-if="currentTrack.icon === 'Sparkles'" :size="22" />
            <SunMedium v-else :size="22" />
          </div>
          <div class="track-info-wrap">
            <div class="track-title-row">
              <h3>{{ currentTrack.name }}</h3>
              <span class="track-tag">{{ currentTrack.category === 'nature' ? '自然白噪音' : '舒缓轻电台' }}</span>
            </div>
            <p class="track-sub">{{ currentTrack.subtitle }}</p>
          </div>
        </div>

        <!-- 音频律动波形 -->
        <div class="sound-wave-bars" :class="{ playing: audioState.isPlaying }" aria-hidden="true">
          <span class="bar bar-1"></span>
          <span class="bar bar-2"></span>
          <span class="bar bar-3"></span>
          <span class="bar bar-4"></span>
          <span class="bar bar-5"></span>
          <span class="bar bar-6"></span>
        </div>
      </div>

      <!-- 声景随想伴读气泡 -->
      <div class="audio-mood-bubble">
        <Sparkles :size="14" class="mood-icon" />
        <p>{{ currentTrack.quote }}</p>
      </div>

      <!-- 控制器：随机在左、三键居中、音量在右（点击后弹出音量条） -->
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
            <Shuffle :size="15" />
          </button>
        </div>

        <!-- 中间：后退、播放/暂停、前进三个按键居中显示 -->
        <div class="controls-center">
          <!-- 后退 / 上一首 -->
          <button
            type="button"
            class="ctrl-icon-btn"
            title="上一首"
            aria-label="上一首"
            @click="prevTrack"
          >
            <SkipBack :size="15" />
          </button>

          <!-- 播放 / 暂停 -->
          <button
            type="button"
            class="play-main-btn"
            :title="audioState.isPlaying ? '暂停' : '播放'"
            :aria-label="audioState.isPlaying ? '暂停' : '播放'"
            @click="togglePlay"
          >
            <Pause v-if="audioState.isPlaying" :size="19" />
            <Play v-else :size="19" class="translate-x-0.5" />
          </button>

          <!-- 前进 / 下一首 -->
          <button
            type="button"
            class="ctrl-icon-btn"
            title="下一首"
            aria-label="下一首"
            @click="nextTrack"
          >
            <SkipForward :size="15" />
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
            <VolumeX v-if="audioState.isMuted || audioState.volume === 0" :size="15" />
            <Volume2 v-else :size="15" />
          </button>

          <!-- 点击后弹出的毛玻璃音量条浮层 -->
          <Transition name="fade-slide">
            <div v-if="showVolumeBar" class="volume-slider-popover glass-panel" @click.stop>
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
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                :value="audioState.isMuted ? 0 : audioState.volume"
                class="volume-slider"
                aria-label="调节音量"
                @input="setVolume(Number(($event.target as HTMLInputElement).value))"
              />
              <span class="vol-num">{{ audioState.isMuted ? '0%' : audioState.volume + '%' }}</span>
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
          :class="{ active: audioState.sleepTimerMinutes === p.val }"
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
  gap: 16px;
  flex: 1;
  margin-bottom: 4px;
}

/* 顶部声景主视窗 */
.audio-hero-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-radius: 18px;
  background: var(--surface);
  border: 1px solid var(--line);
  transition: all 0.25s ease;
}

.audio-hero-panel.is-active {
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--accent) 12%, transparent);
}

.audio-meta-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.track-icon-avatar {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--sage-bg);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.track-icon-avatar.pulse {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent);
  animation: gentlePulse 2.5s infinite ease-in-out;
}

@keyframes gentlePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.track-info-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.track-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.track-title-row h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
  white-space: nowrap;
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

.track-sub {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 律动音波 */
.sound-wave-bars {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 26px;
  padding-right: 4px;
  flex-shrink: 0;
}

.sound-wave-bars .bar {
  width: 3px;
  height: 6px;
  border-radius: 2px;
  background: var(--accent);
  opacity: 0.32;
  transition: height 0.2s ease, opacity 0.2s ease;
}

.sound-wave-bars.playing .bar {
  opacity: 0.85;
  animation: soundBounce 1.2s infinite ease-in-out alternate;
}

.sound-wave-bars.playing .bar-1 { animation-delay: 0.1s; height: 14px; }
.sound-wave-bars.playing .bar-2 { animation-delay: 0.3s; height: 22px; }
.sound-wave-bars.playing .bar-3 { animation-delay: 0.15s; height: 12px; }
.sound-wave-bars.playing .bar-4 { animation-delay: 0.4s; height: 19px; }
.sound-wave-bars.playing .bar-5 { animation-delay: 0.25s; height: 11px; }
.sound-wave-bars.playing .bar-6 { animation-delay: 0.35s; height: 16px; }

@keyframes soundBounce {
  0% { transform: scaleY(0.35); }
  100% { transform: scaleY(1.3); }
}

/* 声景伴读气泡 */
.audio-mood-bubble {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 60%, transparent);
  border: 1px dashed color-mix(in srgb, var(--line) 90%, transparent);
  color: var(--secondary);
  font-size: 13px;
  line-height: 1.5;
  transition: all 0.25s ease;
}

.mood-icon {
  color: var(--accent);
  flex-shrink: 0;
  opacity: 0.85;
}

.audio-mood-bubble p {
  margin: 0;
  letter-spacing: 0.2px;
}

/* 播放控制条：三栏 Grid 布局保证中间三个按键绝对居中 */
.audio-controls-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: 100%;
  padding: 2px 0;
}

.controls-left {
  display: flex;
  justify-content: flex-start;
}

.controls-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.controls-right {
  display: flex;
  justify-content: flex-end;
  position: relative;
}

.ctrl-icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ctrl-icon-btn:hover {
  background: var(--sage-bg);
  color: var(--accent);
  border-color: var(--accent);
}

.ctrl-icon-btn.random-btn:hover {
  transform: rotate(15deg);
}

.vol-toggle-btn.is-active {
  background: var(--sage-bg);
  color: var(--accent);
  border-color: var(--accent);
}

.play-main-btn {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: none;
  background: var(--accent);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 35%, transparent);
  transition: all 0.2s ease;
}

.play-main-btn:hover {
  transform: scale(1.06);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--accent) 45%, transparent);
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
  width: 175px;
  padding: 8px 12px;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 50;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
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

.volume-slider {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  accent-color: var(--accent);
  cursor: pointer;
  background: var(--line);
}

.vol-num {
  font-size: 11px;
  color: var(--muted);
  width: 28px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  user-select: none;
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
  background: var(--accent);
  color: #ffffff;
  border-color: var(--accent);
}
</style>
