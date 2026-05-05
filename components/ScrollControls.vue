<script setup lang="ts">
const autoScrolling = ref(false)
const floatEnabled = ref(true)
const scrollSpeed = ref(40)
const scrollStatus = ref('已停止')

let autoScrollRaf: number | null = null
let lastTime: number | null = null

function startAutoScroll() {
  if (autoScrolling.value) return
  autoScrolling.value = true
  scrollStatus.value = '翻阅中…'
  lastTime = null

  function step(time: number) {
    if (!autoScrolling.value) return
    if (lastTime !== null) {
      const delta = time - lastTime
      const px = scrollSpeed.value * (delta / 1000)
      window.scrollBy(0, px)

      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (scrollTop >= docHeight - 5) {
        stopAutoScroll()
        return
      }
    }
    lastTime = time
    autoScrollRaf = requestAnimationFrame(step)
  }
  autoScrollRaf = requestAnimationFrame(step)
}

function stopAutoScroll() {
  autoScrolling.value = false
  scrollStatus.value = '已停止'
  if (autoScrollRaf) {
    cancelAnimationFrame(autoScrollRaf)
    autoScrollRaf = null
  }
}

function toggleAutoScroll() {
  if (autoScrolling.value) {
    stopAutoScroll()
  } else {
    startAutoScroll()
  }
}

// Stop on user interaction
function onUserScroll() {
  if (autoScrolling.value) stopAutoScroll()
}

onMounted(() => {
  window.addEventListener('wheel', onUserScroll, { passive: true })
  window.addEventListener('touchstart', onUserScroll, { passive: true })
})

onUnmounted(() => {
  stopAutoScroll()
  window.removeEventListener('wheel', onUserScroll)
  window.removeEventListener('touchstart', onUserScroll)
})

const emit = defineEmits<{
  toggleFloat: [enabled: boolean]
}>()

function toggleFloat() {
  floatEnabled.value = !floatEnabled.value
  emit('toggleFloat', floatEnabled.value)
}

// Show control bar after delay
const showBar = ref(false)
onMounted(() => {
  setTimeout(() => { showBar.value = true }, 1800)
})
</script>

<template>
  <Transition name="slide-bar">
    <div v-if="showBar" class="control-bar">
      <button
        class="ctrl-btn"
        :class="{ active: autoScrolling }"
        title="自动翻阅"
        @click="toggleAutoScroll"
      >
        📖
      </button>
      <button
        class="ctrl-btn"
        :class="{ active: floatEnabled }"
        title="浮动文字"
        @click="toggleFloat"
      >
        💭
      </button>
      <div class="ctrl-divider" />
      <span class="ctrl-label">{{ scrollStatus }}</span>
      <select v-model="scrollSpeed" class="speed-select" title="翻阅速度">
        <option :value="15">🐢</option>
        <option :value="40">🚶</option>
        <option :value="90">🐇</option>
      </select>
    </div>
  </Transition>
</template>

<style scoped>
.control-bar {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 14px 12px;
  border-radius: 28px;
  box-shadow: 0 4px 30px rgba(180, 160, 200, 0.2), 0 0 0 1px rgba(255,255,255,0.6) inset;
  z-index: 60;
}

.ctrl-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #F0E8F5;
  background: var(--card-bg);
  color: var(--text-light);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
}
.ctrl-btn:hover {
  border-color: var(--lavender);
  color: var(--lavender);
  transform: scale(1.08);
}
.ctrl-btn.active {
  background: linear-gradient(135deg, var(--lavender-light), var(--pink-light));
  border-color: var(--lavender);
  color: var(--text);
  box-shadow: 0 2px 12px rgba(180, 160, 200, 0.25);
}

.ctrl-divider {
  width: 24px;
  height: 1px;
  background: #F0E8F5;
  flex-shrink: 0;
}

.ctrl-label {
  font-size: 0.72rem;
  color: var(--text-light);
  white-space: nowrap;
  font-family: 'ZCOOL KuaiLe', cursive;
  letter-spacing: 1px;
  min-width: 60px;
  text-align: center;
}

.speed-select {
  padding: 4px 10px;
  border: 2px solid #F0E8F5;
  border-radius: 12px;
  font-size: 0.72rem;
  font-family: 'Noto Serif SC', serif;
  color: var(--text);
  background: var(--card-bg);
  outline: none;
  cursor: pointer;
  transition: border-color 0.3s;
}
.speed-select:focus { border-color: var(--lavender); }

.slide-bar-enter-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.slide-bar-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.slide-bar-enter-from {
  opacity: 0;
  transform: translateY(-50%) translateX(20px);
}
.slide-bar-enter-to {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}
.slide-bar-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(20px);
}
</style>
