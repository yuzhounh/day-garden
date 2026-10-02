import { reactive, watch, computed } from 'vue'

export interface AudioTrack {
  id: string
  name: string
  subtitle: string
  quote: string
  category: 'nature' | 'music'
  type: 'synth' | 'stream'
  icon: string
  streamUrl?: string
  synthType?: 'rain' | 'stream' | 'breeze' | 'bowl'
}

export const AUDIO_TRACKS: AudioTrack[] = [
  {
    id: 'rain',
    name: '细雨淅沥',
    subtitle: '自然白噪音 · 窗外柔和春雨声',
    quote: '窗外细雨淅沥，洗净尘嚣，静享此刻专注与安宁。',
    category: 'nature',
    type: 'synth',
    icon: 'CloudRain',
    synthType: 'rain',
  },
  {
    id: 'stream',
    name: '山涧清溪',
    subtitle: '自然白噪音 · 卵石水流潺潺低语',
    quote: '空山闻流水，清泉过石隙，带走心头喧杂与疲乏。',
    category: 'nature',
    type: 'synth',
    icon: 'Waves',
    synthType: 'stream',
  },
  {
    id: 'breeze',
    name: '松林微风',
    subtitle: '自然白噪音 · 树梢沙沙穿林声',
    quote: '清风穿松林，簌簌轻拂，身心自如舒展与放空。',
    category: 'nature',
    type: 'synth',
    icon: 'Wind',
    synthType: 'breeze',
  },
  {
    id: 'bowl',
    name: '禅意颂钵',
    subtitle: '冥想疗愈 · 悠长沉静的共振泛音',
    quote: '铜钵深沉悠远，泛音长鸣，安住当下与均匀呼吸。',
    category: 'nature',
    type: 'synth',
    icon: 'Bell',
    synthType: 'bowl',
  },
  {
    id: 'lofi',
    name: '惬意 Lo-Fi',
    subtitle: '24/7 慢拍轻音 · 学习工作治愈背景',
    quote: '舒缓悠然的低保真慢节拍，温和陪伴伏案与专注时光。',
    category: 'music',
    type: 'stream',
    icon: 'Coffee',
    streamUrl: 'https://listen.reyfm.de/lofi_320kbps.mp3',
  },
  {
    id: 'dronezone',
    name: '冥想漫步',
    subtitle: 'SomaFM 纯净电台 · 深邃舒展氛围声景',
    quote: '空灵环境音景漫游，如在浩瀚星海与云雾间轻柔漂浮。',
    category: 'music',
    type: 'stream',
    icon: 'Sparkles',
    streamUrl: 'https://ice1.somafm.com/dronezone-128-mp3',
  },
  {
    id: 'groovesalad',
    name: '闲适午后',
    subtitle: 'SomaFM 纯净电台 · 慢调轻盈旋律',
    quote: '轻盈慢调律动，宛如初春午后穿过树叶洒下的斑驳暖阳。',
    category: 'music',
    type: 'stream',
    icon: 'SunMedium',
    streamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
  },
]

export const audioState = reactive({
  isPlaying: false,
  currentTrackId: 'rain',
  volume: 70, // 0 - 100
  isMuted: false,
  sleepTimerMinutes: 0, // 0 = off, 15, 30, 45, 60
  sleepTimerRemaining: 0, // remaining seconds
  error: '',
})

export const currentTrack = computed(() => {
  return AUDIO_TRACKS.find(t => t.id === audioState.currentTrackId) || AUDIO_TRACKS[0]!
})

// Web Audio API Context & Nodes
let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let currentStreamAudio: HTMLAudioElement | null = null
let synthCleanup: (() => void) | null = null
let timerInterval: number | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = new AudioContextClass()
    masterGain = audioCtx.createGain()
    masterGain.connect(audioCtx.destination)
    applyVolume()
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

function applyVolume() {
  const effectiveVol = audioState.isMuted ? 0 : audioState.volume / 100
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(effectiveVol, audioCtx.currentTime)
  }
  if (currentStreamAudio) {
    currentStreamAudio.volume = effectiveVol
  }
}

// Synthesizer 1: Spring Rain (细雨)
function startRainSynth(ctx: AudioContext, destination: GainNode): () => void {
  // Generate 5s pink/brown noise buffer
  const bufferSize = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.96900 * b2 + white * 0.1538520
    b3 = 0.86650 * b3 + white * 0.3104856
    b4 = 0.55000 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.0168980
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  noise.loop = true

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 1000

  const gain = ctx.createGain()
  gain.gain.value = 0.75

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(destination)

  noise.start()

  return () => {
    try {
      noise.stop()
      noise.disconnect()
      filter.disconnect()
      gain.disconnect()
    } catch {}
  }
}

// Synthesizer 2: Forest Stream (山涧清溪)
function startStreamSynth(ctx: AudioContext, destination: GainNode): () => void {
  const bufferSize = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.22
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  noise.loop = true

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 460
  filter.Q.value = 2.8

  // Gentle LFO to modulate stream gurgle
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.7
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 180

  lfo.connect(lfoGain)
  lfoGain.connect(filter.frequency)

  const gain = ctx.createGain()
  gain.gain.value = 0.85

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(destination)

  noise.start()
  lfo.start()

  return () => {
    try {
      noise.stop()
      lfo.stop()
      noise.disconnect()
      lfo.disconnect()
      filter.disconnect()
      gain.disconnect()
    } catch {}
  }
}

// Synthesizer 3: Forest Breeze (松林微风)
function startBreezeSynth(ctx: AudioContext, destination: GainNode): () => void {
  const bufferSize = ctx.sampleRate * 5
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let lastOut = 0.0
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1
    data[i] = (lastOut + (0.02 * white)) / 1.02
    lastOut = data[i]
    data[i] *= 3.5
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  noise.loop = true

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 320

  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.12
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 140

  lfo.connect(lfoGain)
  lfoGain.connect(filter.frequency)

  const gain = ctx.createGain()
  gain.gain.value = 0.8

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(destination)

  noise.start()
  lfo.start()

  return () => {
    try {
      noise.stop()
      lfo.stop()
      noise.disconnect()
      lfo.disconnect()
      filter.disconnect()
      gain.disconnect()
    } catch {}
  }
}

// Synthesizer 4: Zen Singing Bowl (禅意颂钵)
function startBowlSynth(ctx: AudioContext, destination: GainNode): () => void {
  let isRunning = true
  let bowlTimer: number | null = null

  function strikeBowl() {
    if (!isRunning || ctx.state === 'closed') return
    const now = ctx.currentTime
    const rootFreq = 216 // Relaxing 432Hz harmonic base
    const harmonics = [
      { freq: rootFreq, gain: 0.35, decay: 7.0 },
      { freq: rootFreq * 2.01, gain: 0.22, decay: 5.5 },
      { freq: rootFreq * 3.03, gain: 0.14, decay: 4.0 },
      { freq: rootFreq * 4.76, gain: 0.08, decay: 2.8 },
    ]

    harmonics.forEach(({ freq, gain: targetGain, decay }) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)

      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, now)
      g.gain.linearRampToValueAtTime(targetGain, now + 0.08)
      g.gain.exponentialRampToValueAtTime(0.0001, now + decay)

      osc.connect(g)
      g.connect(destination)

      osc.start(now)
      osc.stop(now + decay + 0.1)
      window.setTimeout(() => {
        try {
          osc.disconnect()
          g.disconnect()
        } catch {}
      }, (decay + 0.2) * 1000)
    })

    // Strike again in 6 to 9 seconds
    const nextInterval = 6500 + Math.random() * 2500
    bowlTimer = window.setTimeout(strikeBowl, nextInterval)
  }

  strikeBowl()

  return () => {
    isRunning = false
    if (bowlTimer) clearTimeout(bowlTimer)
  }
}

function stopCurrentAudio() {
  if (synthCleanup) {
    synthCleanup()
    synthCleanup = null
  }
  if (currentStreamAudio) {
    currentStreamAudio.pause()
    currentStreamAudio.src = ''
    currentStreamAudio.load()
    currentStreamAudio = null
  }
}

export function playTrack(trackId: string) {
  const track = AUDIO_TRACKS.find(t => t.id === trackId) || AUDIO_TRACKS[0]!
  audioState.currentTrackId = track.id
  audioState.error = ''
  stopCurrentAudio()

  try {
    const ctx = getAudioContext()
    if (!masterGain) return

    if (track.type === 'synth') {
      if (track.synthType === 'rain') {
        synthCleanup = startRainSynth(ctx, masterGain)
      } else if (track.synthType === 'stream') {
        synthCleanup = startStreamSynth(ctx, masterGain)
      } else if (track.synthType === 'breeze') {
        synthCleanup = startBreezeSynth(ctx, masterGain)
      } else if (track.synthType === 'bowl') {
        synthCleanup = startBowlSynth(ctx, masterGain)
      }
      audioState.isPlaying = true
    } else if (track.type === 'stream' && track.streamUrl) {
      const audio = new Audio()
      audio.src = track.streamUrl
      audio.preload = 'none'
      audio.volume = audioState.isMuted ? 0 : audioState.volume / 100

      audio.addEventListener('error', () => {
        audioState.isPlaying = false
        audioState.error = audio.error?.code === 2 ? '电台网络连接失败，请稍后重试或切换曲目。' : audio.error?.code === 3 ? '这段音频暂时无法解码，请切换曲目。' : '这首曲目暂时不可用，可能受到访问限制，请切换其他曲目。'
      })

      currentStreamAudio = audio
      audio.play().then(() => {
        audioState.isPlaying = true
      }).catch((err) => {
        console.warn('Audio stream autoplay blocked or error:', err)
        audioState.error = err?.name === 'NotAllowedError' ? '浏览器需要你点击播放后才能聆听。' : audioState.error || '电台连接失败，请稍后重试或切换曲目。'
        audioState.isPlaying = false
      })
    }
  } catch (e) {
    console.error('Failed to play audio track:', e)
    audioState.error = '音频服务启动异常'
    audioState.isPlaying = false
  }
}

export function pauseAudio() {
  audioState.isPlaying = false
  stopCurrentAudio()
}

export function togglePlay() {
  if (audioState.isPlaying) {
    pauseAudio()
  } else {
    playTrack(audioState.currentTrackId)
  }
}

export function setVolume(val: number) {
  audioState.volume = Math.max(0, Math.min(100, Math.round(val)))
  if (audioState.volume > 0 && audioState.isMuted) {
    audioState.isMuted = false
  }
  applyVolume()
}

export function toggleMute() {
  audioState.isMuted = !audioState.isMuted
  applyVolume()
}

export function nextTrack() {
  const idx = AUDIO_TRACKS.findIndex(t => t.id === audioState.currentTrackId)
  const nextIdx = (idx + 1) % AUDIO_TRACKS.length
  playTrack(AUDIO_TRACKS[nextIdx]!.id)
}

export function prevTrack() {
  const idx = AUDIO_TRACKS.findIndex(t => t.id === audioState.currentTrackId)
  const prevIdx = (idx - 1 + AUDIO_TRACKS.length) % AUDIO_TRACKS.length
  playTrack(AUDIO_TRACKS[prevIdx]!.id)
}

export function randomTrack() {
  const others = AUDIO_TRACKS.filter(t => t.id !== audioState.currentTrackId)
  const pool = others.length > 0 ? others : AUDIO_TRACKS
  const next = pool[Math.floor(Math.random() * pool.length)]!
  playTrack(next.id)
}

export function setSleepTimer(minutes: number) {
  audioState.sleepTimerMinutes = minutes
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }

  if (minutes <= 0) {
    audioState.sleepTimerRemaining = 0
    return
  }

  audioState.sleepTimerRemaining = minutes * 60
  timerInterval = window.setInterval(() => {
    if (audioState.sleepTimerRemaining > 0) {
      audioState.sleepTimerRemaining--
      if (audioState.sleepTimerRemaining === 0) {
        pauseAudio()
        audioState.sleepTimerMinutes = 0
        if (timerInterval) clearInterval(timerInterval)
      }
    }
  }, 1000)
}

// Watch volume changes to ensure hardware sync
watch(() => [audioState.volume, audioState.isMuted], applyVolume)
