<script setup lang="ts">
import type { RegistryEntry } from '~/composables/useThoughts'

const { thoughts, stats, loading, fetchAllThoughts, fetchStats } = useThoughts()
const barrageRef = ref()

// Registry / db selection
const registries = ref<RegistryEntry[]>([])
const selectedDb = ref('')
const selectedName = ref('')
const registryLoaded = ref(false)

async function fetchRegistry() {
  try {
    registries.value = await $fetch<RegistryEntry[]>('/api/registry')
  } catch {
    registries.value = []
  }

  // 如果返回空，可能是插件还没注册，自动重试
  if (registries.value.length === 0) {
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 3000))
      try {
        registries.value = await $fetch<RegistryEntry[]>('/api/registry')
      } catch { /* ignore */ }
      if (registries.value.length > 0) break
    }
  }

  registryLoaded.value = true

  // Auto-select if only one
  if (registries.value.length === 1) {
    selectDb(registries.value[0])
  }
}

function selectDb(entry: RegistryEntry) {
  selectedDb.value = entry.db_name
  selectedName.value = entry.display_name
  fetchAllThoughts(entry.db_name)
  fetchStats(entry.db_name)
}

function onToggleFloat(enabled: boolean) {
  barrageRef.value?.toggleFloat(enabled)
}

function onCalendarJump(dateKey: string) {
  const el = document.getElementById(`date-${dateKey}`)
  if (el) {
    const rect = el.getBoundingClientRect()
    const targetY = window.scrollY + rect.top - window.innerHeight / 3
    window.scrollTo({ top: targetY, behavior: 'smooth' })
  }
}

onMounted(() => {
  fetchRegistry()
})
</script>

<template>
  <div class="page">
    <!-- Background decorations -->
    <div class="bg-deco">
      <div class="circle c1" />
      <div class="circle c2" />
      <div class="circle c3" />
      <div class="circle c4" />
    </div>

    <BarrageLayer ref="barrageRef" :thoughts="thoughts" :loading="loading" />

    <!-- Scroll progress -->
    <ScrollProgress />

    <!-- Header -->
    <header class="header">
      <h1><span class="highlight">回忆碎片</span></h1>
      <p class="subtitle">那些被悄悄记下的心事与碎碎念</p>
    </header>

    <!-- Db selector (before selecting) -->
    <Transition name="fade" mode="out-in">
      <div v-if="registryLoaded && !selectedDb" class="db-select-wrap">
        <div v-if="registries.length === 0" class="db-empty">
          <div class="db-empty-icon">💭</div>
          <p>还没有开放的记忆空间</p>
        </div>
        <div v-else>
          <p class="db-prompt">选择一个记忆空间来翻阅 ~</p>
          <div class="db-list">
            <button
              v-for="r in registries"
              :key="r.db_name"
              class="db-card"
              @click="selectDb(r)"
            >
              <span class="db-card-icon">{{ r.icon || '💭' }}</span>
              <span class="db-card-name">{{ r.display_name }}</span>
              <span class="db-card-count" v-if="r.count">{{ r.count }} 碎片</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Selected: show name + back button -->
    <div v-if="selectedDb" class="selected-bar">
      <span class="selected-name">{{ selectedName || selectedDb }}</span>
      <button class="back-btn" @click="selectedDb = ''; selectedName = ''">切换</button>
    </div>

    <!-- Loading screen -->
    <Transition name="fade">
      <div v-if="loading && selectedDb" class="loading-screen">
        <div class="loading-icon">✨</div>
        <div class="loading-text">正在翻阅记忆<span class="loading-dots" /></div>
      </div>
    </Transition>

    <!-- Stats counter -->
    <StatsCounter v-if="selectedDb" :stats="stats" :loading="loading" />

    <!-- Timeline -->
    <MemoryTimeline v-if="selectedDb" :thoughts="thoughts" :loading="loading" />

    <!-- Footer -->
    <footer v-if="selectedDb" class="footer">
      <div class="end-mark">— 回忆到此为止，生活还在继续 —</div>
      <div class="end-sub">每一段记忆都值得被珍藏 ✨</div>
    </footer>

    <!-- Controls -->
    <ScrollControls v-if="selectedDb" @toggle-float="onToggleFloat" />

    <!-- Calendar -->
    <CalendarDrawer v-if="selectedDb" :thoughts="thoughts" @jump="onCalendarJump" />
  </div>
</template>

<style>
:root {
  --bg: #FFF8F0;
  --card-bg: #FFFFFF;
  --pink: #FFB5C2;
  --pink-light: #FFD6DE;
  --lavender: #C5B3E6;
  --lavender-light: #E8DFFB;
  --mint: #A8E6CF;
  --mint-light: #D4F5E6;
  --peach: #FFD1A9;
  --peach-light: #FFE8D0;
  --text: #5A4A6B;
  --text-light: #8B7DA0;
  --shadow: rgba(180, 160, 200, 0.15);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'Noto Serif SC', serif;
  background: var(--bg);
  color: var(--text);
  overflow-x: hidden;
  position: relative;
}

/* Background decorations */
.bg-deco {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.bg-deco .circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.12;
  animation: floatSlow 20s ease-in-out infinite;
}
.bg-deco .c1 { width: 400px; height: 400px; background: var(--pink); top: -100px; right: -80px; }
.bg-deco .c2 { width: 250px; height: 250px; background: var(--lavender); top: 30%; left: -60px; animation-delay: -7s; }
.bg-deco .c3 { width: 180px; height: 180px; background: var(--mint); top: 60%; right: -40px; animation-delay: -13s; }
.bg-deco .c4 { width: 300px; height: 300px; background: var(--peach); bottom: -80px; left: 20%; animation-delay: -4s; }

@keyframes floatSlow {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(20px, -15px) scale(1.05); }
  66% { transform: translate(-15px, 10px) scale(0.95); }
}

/* Loading screen */
.loading-screen {
  position: fixed;
  inset: 0;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.loading-icon { font-size: 3rem; animation: bounce 1s ease-in-out infinite; }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
.loading-text {
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: 1.1rem;
  color: var(--text-light);
  margin-top: 16px;
  letter-spacing: 3px;
}
.loading-dots::after { content: ''; animation: dots 1.5s steps(4) infinite; }
@keyframes dots { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.8s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Header */
.header {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 80px 20px 40px;
}
.header h1 {
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: 2.4rem;
  color: var(--text);
  letter-spacing: 4px;
  margin-bottom: 10px;
}
.header .highlight {
  background: linear-gradient(135deg, var(--pink), var(--lavender));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.header .subtitle {
  font-size: 0.9rem;
  color: var(--text-light);
  letter-spacing: 2px;
}

/* Db selector */
.db-select-wrap {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 40px 20px 80px;
}
.db-prompt {
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: 1rem;
  color: var(--text-light);
  margin-bottom: 24px;
  letter-spacing: 2px;
}
.db-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  max-width: 600px;
  margin: 0 auto;
}
.db-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 32px;
  background: var(--card-bg);
  border: 2px solid transparent;
  border-radius: 20px;
  box-shadow: 0 4px 20px var(--shadow);
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
}
.db-card:hover {
  border-color: var(--lavender);
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(180, 160, 200, 0.25);
}
.db-card-icon { font-size: 2rem; }
.db-card-name {
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: 1rem;
  color: var(--text);
  letter-spacing: 1px;
}
.db-card-count {
  font-size: 0.72rem;
  color: var(--text-light);
}
.db-empty {
  padding: 60px 20px;
}
.db-empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}
.db-empty p {
  color: var(--text-light);
  font-size: 0.9rem;
}

/* Selected bar */
.selected-bar {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 0 20px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.selected-name {
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: 0.9rem;
  color: var(--lavender);
  letter-spacing: 2px;
}
.back-btn {
  font-size: 0.72rem;
  padding: 4px 14px;
  border-radius: 12px;
  border: 1px solid var(--lavender-light);
  background: var(--card-bg);
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.3s ease;
}
.back-btn:hover {
  border-color: var(--lavender);
  color: var(--lavender);
}

/* Footer */
.footer {
  text-align: center;
  padding: 40px 20px 60px;
  position: relative;
  z-index: 2;
}
.footer .end-mark {
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: 1.1rem;
  color: var(--text-light);
  letter-spacing: 3px;
}
.footer .end-sub {
  font-size: 0.75rem;
  color: var(--lavender);
  margin-top: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .header {
    padding: 50px 16px 24px;
  }
  .header h1 { font-size: 1.8rem; }
  .header .subtitle { font-size: 0.8rem; }

  .db-select-wrap { padding: 24px 16px 60px; }
  .db-list { gap: 12px; }
  .db-card {
    padding: 18px 24px;
    min-width: 120px;
    border-radius: 16px;
  }
  .db-card-icon { font-size: 1.6rem; }
  .db-card-name { font-size: 0.85rem; }

  .selected-bar { padding: 0 16px 16px; }

  .bg-deco .c1 { width: 250px; height: 250px; }
  .bg-deco .c2 { width: 150px; height: 150px; }
  .bg-deco .c3 { width: 120px; height: 120px; }
  .bg-deco .c4 { width: 180px; height: 180px; }

  .footer { padding: 30px 16px 50px; }
  .footer .end-mark { font-size: 0.9rem; letter-spacing: 2px; }
}
</style>
