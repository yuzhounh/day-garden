<script setup lang="ts">
import { computed } from 'vue'
import {
  Headphones,
  Play,
  Pause,
  SkipBack,
  SkipForward,
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
  AUDIO_TRACKS,
  audioState,
  togglePlay,
  playTrack,
  prevTrack,
  nextTrack,
  setVolume,
  toggleMute,
  setSleepTimer,
} from '../services/audio'

const currentTrack = computed(() => {
  return AUDIO_TRACKS.find(t => t.id === audioState.currentTrackId) || AUDIO_TRACKS[0]!
})

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
      <!-- 播放器主视窗与声波动效 -->
      <div class="audio-hero-panel" :class="{ 'is-active': audioState.isPlaying }">
        <div class="audio-meta-left">
          <div class="track-icon-avatar" :class="{ pulse: audioState.isPlaying }">
            <CloudRain v-if="currentTrack.icon === 'CloudRain'" :size="20" />
            <Waves v-else-if="currentTrack.icon === 'Waves'" :size="20" />
            <Wind v-else-if="currentTrack.icon === 'Wind'" :size="20" />
            <Bell v-else-if="currentTrack.icon === 'Bell'" :size="20" />
            <Coffee v-else-if="currentTrack.icon === 'Coffee'" :size="20" />
            <Sparkles v-else-if="currentTrack.icon === 'Sparkles'" :size="20" />
            <SunMedium v-else :size="20" />
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
        <div class="sound-wave-bars" :class="{ playing: audioState.isPlaying }">
          <span class="bar bar-1"></span>
          <span class="bar bar-2"></span>
          <span class="bar bar-3"></span>
          <span class="bar bar-4"></span>
          <span class="bar bar-5"></span>
        </div>
      </div>

      <!-- 控制器：上一首、播放/暂停、下一首、音量调节 -->
      <div class="audio-controls-row">
        <div class="playback-btns">
          <button
            type="button"
            class="ctrl-icon-btn small"
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
            <Pause v-if="audioState.isPlaying" :size="18" />
            <Play v-else :size="18" class="translate-x-0.5" />
          </button>
          <button
            type="button"
            class="ctrl-icon-btn small"
            title="下一首"
            aria-label="下一首"
            @click="nextTrack"
          >
            <SkipForward :size="15" />
          </button>
        </div>

        <!-- 音量滑块与静音切换 -->
        <div class="volume-control-wrap">
          <button
            type="button"
            class="vol-icon-btn"
            :title="audioState.isMuted ? '取消静音' : '静音'"
            :aria-label="audioState.isMuted ? '取消静音' : '静音'"
            @click="toggleMute"
          >
            <VolumeX v-if="audioState.isMuted || audioState.volume === 0" :size="15" />
            <Volume2 v-else :size="15" />
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
      </div>

      <!-- 场景声音与电台快捷选择胶囊 -->
      <div class="track-pills-grid">
        <button
          v-for="track in AUDIO_TRACKS"
          :key="track.id"
          type="button"
          class="track-pill"
          :class="{ active: audioState.currentTrackId === track.id }"
          @click="playTrack(track.id)"
        >
          <span class="pill-dot"></span>
          <span>{{ track.name }}</span>
        </button>
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
  gap: 14px;
  flex: 1;
}

/* 顶部视窗 */
.audio-hero-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  transition: all 0.25s ease;
}

.audio-hero-panel.is-active {
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--accent) 12%, transparent);
}

.audio-meta-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.track-icon-avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
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
  gap: 3px;
  min-width: 0;
}

.track-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.track-title-row h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
  white-space: nowrap;
}

.track-tag {
  font-size: 10.5px;
  padding: 1px 6px;
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
  height: 24px;
  padding-right: 4px;
  flex-shrink: 0;
}

.sound-wave-bars .bar {
  width: 3px;
  height: 6px;
  border-radius: 2px;
  background: var(--accent);
  opacity: 0.35;
  transition: height 0.2s ease, opacity 0.2s ease;
}

.sound-wave-bars.playing .bar {
  opacity: 0.85;
  animation: soundBounce 1.2s infinite ease-in-out alternate;
}

.sound-wave-bars.playing .bar-1 { animation-delay: 0.1s; height: 14px; }
.sound-wave-bars.playing .bar-2 { animation-delay: 0.3s; height: 20px; }
.sound-wave-bars.playing .bar-3 { animation-delay: 0.15s; height: 12px; }
.sound-wave-bars.playing .bar-4 { animation-delay: 0.4s; height: 18px; }
.sound-wave-bars.playing .bar-5 { animation-delay: 0.25s; height: 10px; }

@keyframes soundBounce {
  0% { transform: scaleY(0.4); }
  100% { transform: scaleY(1.3); }
}

/* 播放控制条 */
.audio-controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 2px;
}

.playback-btns {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ctrl-icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 9px;
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

.play-main-btn {
  width: 40px;
  height: 40px;
  border-radius: 13px;
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

.volume-control-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 170px;
}

.vol-icon-btn {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.15s ease;
}

.vol-icon-btn:hover {
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
  width: 30px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  user-select: none;
}

/* 场景标签网格 */
.track-pills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}

.track-pill {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
  border-radius: 11px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.track-pill .pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted);
  transition: background 0.15s ease;
}

.track-pill:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  background: var(--sage-bg);
}

.track-pill.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  color: var(--accent);
  font-weight: 600;
}

.track-pill.active .pill-dot {
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent);
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
  .track-pills-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .volume-control-wrap {
    max-width: 130px;
  }
}
</style>
