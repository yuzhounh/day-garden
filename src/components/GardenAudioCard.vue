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
      <!-- 胶片唱盘与声景信息展示区域（垂直居中） -->
      <div class="audio-vinyl-stage">
        <!-- 左侧：黑胶唱片（播放时持续慢速优雅旋转，暂停时停止） -->
        <div class="vinyl-record-wrap">
          <div class="vinyl-disc" :class="{ spinning: audioState.isPlaying }">
            <div class="vinyl-groove-ring ring-1"></div>
            <div class="vinyl-groove-ring ring-2"></div>
            <div class="vinyl-groove-ring ring-3"></div>
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
              <span class="vinyl-spindle-hole"></span>
            </div>
          </div>
        </div>

        <!-- 右侧：展示音乐名、标签、跳动竖线与副标题 -->
        <div class="vinyl-meta-right">
          <div class="vinyl-tag-row">
            <span class="track-tag">{{ currentTrack.category === 'nature' ? '自然白噪音' : '舒缓轻电台' }}</span>
            <!-- 与小卡片风格一致的跳动竖线 -->
            <div class="sound-wave-bars" :class="{ playing: audioState.isPlaying }" aria-hidden="true">
              <span class="bar bar-1"></span>
              <span class="bar bar-2"></span>
              <span class="bar bar-3"></span>
              <span class="bar bar-4"></span>
              <span class="bar bar-5"></span>
              <span class="bar bar-6"></span>
            </div>
          </div>
          <h3 class="vinyl-track-title">{{ currentTrack.name }}</h3>
          <p class="vinyl-track-sub">{{ currentTrack.subtitle }}</p>
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
            <Shuffle :size="15" />
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
            <SkipBack :size="15" />
          </button>

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
  flex: 1;
  min-height: 0;
  margin-bottom: 4px;
  gap: 16px;
}

/* 胶片唱盘与音乐展示区域（在上下间隙中垂直居中） */
.audio-vinyl-stage {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 8px 6px;
  margin: auto 0;
}

/* 黑胶唱片 */
.vinyl-record-wrap {
  position: relative;
  flex-shrink: 0;
  filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.16));
}

.vinyl-disc {
  width: 118px;
  height: 118px;
  border-radius: 50%;
  position: relative;
  display: grid;
  place-items: center;
  background:
    repeating-radial-gradient(
      circle at 50% 50%,
      rgba(255, 255, 255, 0.04) 0px,
      rgba(255, 255, 255, 0.04) 1px,
      transparent 2px,
      transparent 4px
    ),
    radial-gradient(circle, #2d343b 0%, #1a1e22 65%, #0f1214 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.12),
    inset 0 0 18px rgba(0, 0, 0, 0.7);
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
  border: 1px solid rgba(255, 255, 255, 0.06);
  pointer-events: none;
}

.vinyl-groove-ring.ring-1 { width: 94px; height: 94px; }
.vinyl-groove-ring.ring-2 { width: 74px; height: 74px; }
.vinyl-groove-ring.ring-3 { width: 58px; height: 58px; }

.vinyl-center-label {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--sage-bg);
  color: var(--accent);
  display: grid;
  place-items: center;
  position: relative;
  border: 2px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.28);
  z-index: 2;
}

.vinyl-icon-inner {
  display: grid;
  place-items: center;
}

.vinyl-spindle-hole {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--surface);
  border: 1.5px solid rgba(0, 0, 0, 0.25);
  pointer-events: none;
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
  justify-content: space-between;
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

/* 律动音波 */
.sound-wave-bars {
  display: flex;
  align-items: center;
  gap: 2.5px;
  height: 18px;
  flex-shrink: 0;
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

/* 播放控制条：与小卡片保持完全一致的边框包裹与居中布局 */
.audio-controls-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: 100%;
  padding: 8px 16px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.controls-left {
  display: flex;
  justify-content: flex-start;
}

.controls-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.controls-right {
  display: flex;
  justify-content: flex-end;
  position: relative;
}

.ctrl-icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 9px;
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

.ctrl-icon-btn.random-btn:hover {
  transform: rotate(15deg);
}

.ctrl-icon-btn.vol-toggle-btn.is-active {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
}

.play-main-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 35%, transparent);
  transition: all 0.2s ease;
}

.play-main-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--accent) 45%, transparent);
}

.play-main-btn:active {
  transform: scale(0.95);
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

@media (max-width: 480px) {
  .audio-vinyl-stage {
    gap: 16px;
  }
  .vinyl-disc {
    width: 96px;
    height: 96px;
  }
  .vinyl-groove-ring.ring-1 { width: 76px; height: 76px; }
  .vinyl-groove-ring.ring-2 { width: 60px; height: 60px; }
  .vinyl-groove-ring.ring-3 { width: 46px; height: 46px; }
  .vinyl-center-label {
    width: 38px;
    height: 38px;
  }
  .vinyl-track-title {
    font-size: 18px;
  }
}
</style>
