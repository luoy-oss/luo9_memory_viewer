<script setup lang="ts">
import type { Thought } from '~/composables/useThoughts'

const props = defineProps<{
  thoughts: Thought[]
  loading: boolean
}>()

interface BarrageStyle {
  color: string
  shadow: string
}

const BARRAGE_STYLES: BarrageStyle[] = [
  { color: '#e8a0b8', shadow: '0 0 12px rgba(232,160,184,0.4)' },
  { color: '#b0a0e0', shadow: '0 0 12px rgba(176,160,224,0.4)' },
  { color: '#80d0a8', shadow: '0 0 12px rgba(128,208,168,0.35)' },
  { color: '#e0b880', shadow: '0 0 12px rgba(224,184,128,0.35)' },
  { color: '#90b8d0', shadow: '0 0 12px rgba(144,184,208,0.35)' },
  { color: '#d09090', shadow: '0 0 12px rgba(208,144,144,0.35)' },
]

const LANE_COUNT = 10
const MAX_BARRAGES = 16

const containerRef = ref<HTMLElement>()
const floatEnabled = ref(true)
let barrageTimer: ReturnType<typeof setInterval> | null = null
let activeBarrages = 0
const laneOccupied = new Array(LANE_COUNT).fill(false)

function pickLane(): number {
  const attempts = Array.from({ length: LANE_COUNT }, (_, i) => i)
  for (let i = attempts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [attempts[i], attempts[j]] = [attempts[j], attempts[i]]
  }
  for (const lane of attempts) {
    if (!laneOccupied[lane]) return lane
  }
  return Math.floor(Math.random() * LANE_COUNT)
}

function spawnBarrage() {
  if (!floatEnabled.value || activeBarrages >= MAX_BARRAGES || !props.thoughts.length || !containerRef.value) return

  const el = document.createElement('div')
  el.className = 'barrage-item'

  // Pick random memory fragment
  const t = props.thoughts[Math.floor(Math.random() * props.thoughts.length)]
  let text = t.content
  const maxLen = 10 + Math.floor(Math.random() * 14)
  if (text.length > maxLen) {
    const start = Math.floor(Math.random() * (text.length - maxLen))
    text = text.substring(start, start + maxLen)
  }
  el.textContent = text

  // Lane positioning
  const lane = pickLane()
  laneOccupied[lane] = true
  const laneHeight = 100 / LANE_COUNT
  const top = lane * laneHeight + Math.random() * (laneHeight * 0.3)

  // Style
  const style = BARRAGE_STYLES[Math.floor(Math.random() * BARRAGE_STYLES.length)]
  const size = 0.85 + Math.random() * 0.65
  const opacity = 0.22 + Math.random() * 0.2
  const duration = 18 + Math.random() * 14

  el.style.cssText = `
    top: ${top}%;
    font-size: ${size}rem;
    color: ${style.color};
    opacity: ${opacity};
    text-shadow: ${style.shadow};
    animation-duration: ${duration}s;
  `

  containerRef.value.appendChild(el)
  activeBarrages++

  const cleanup = () => {
    el.remove()
    activeBarrages--
    laneOccupied[lane] = false
  }
  el.addEventListener('animationend', cleanup)
  setTimeout(cleanup, (duration + 3) * 1000)
}

function startFloating() {
  if (barrageTimer) return
  floatEnabled.value = true
  for (let i = 0; i < 5; i++) {
    setTimeout(() => spawnBarrage(), i * 500)
  }
  barrageTimer = setInterval(spawnBarrage, 2200)
}

function stopFloating() {
  floatEnabled.value = false
  if (barrageTimer) {
    clearInterval(barrageTimer)
    barrageTimer = null
  }
}

// Expose toggle for parent
defineExpose({ toggleFloat: (enabled: boolean) => {
  if (enabled) startFloating()
  else stopFloating()
}})

onMounted(() => {
  // Wait for data to load
  const unwatch = watch(() => props.loading, (isLoading) => {
    if (!isLoading && props.thoughts.length > 0) {
      setTimeout(() => startFloating(), 1500)
      unwatch()
    }
  }, { immediate: true })
})

onUnmounted(() => {
  stopFloating()
})
</script>

<template>
  <div ref="containerRef" class="barrage-layer" />
</template>

<style>
.barrage-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}
.barrage-item {
  position: absolute;
  font-family: 'ZCOOL KuaiLe', cursive;
  white-space: nowrap;
  right: -100%;
  will-change: transform;
  animation: barrageGo linear forwards;
  user-select: none;
  letter-spacing: 2px;
}
@keyframes barrageGo {
  0%   { transform: translateX(0); }
  100% { transform: translateX(calc(-100vw - 100%)); }
}
</style>
