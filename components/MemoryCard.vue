<script setup lang="ts">
import { CATEGORY_MAP, type Thought } from '~/composables/useThoughts'

const props = defineProps<{
  thought: Thought
  index: number
}>()

const el = ref<HTMLElement>()
const visible = ref(false)
const shown = ref(false)
const typed = ref(false)
const textContent = ref('')
const cursorActive = ref(false)

const side = computed(() => props.index % 2 === 0 ? 'left' : 'right')
const catInfo = computed(() => CATEGORY_MAP[props.thought.category] || CATEGORY_MAP.feeling)

let observer: IntersectionObserver | null = null
const pendingTimers: ReturnType<typeof setTimeout>[] = []

function scheduleTimer(fn: () => void, ms: number) {
  const id = setTimeout(fn, ms)
  pendingTimers.push(id)
  return id
}

function clearTimers() {
  for (const id of pendingTimers) clearTimeout(id)
  pendingTimers.length = 0
}

function formatDate(ts: number) {
  const d = new Date(ts * 1000)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${m}月${day}日 周${w} ${h}:${min}`
}

function typewrite() {
  const text = props.thought.content
  cursorActive.value = true
  textContent.value = ''

  let i = 0
  const type = () => {
    if (i < text.length) {
      textContent.value += text[i]
      i++
      scheduleTimer(type, 38)
    } else {
      scheduleTimer(() => { cursorActive.value = false }, 2000)
    }
  }
  type()
}

onMounted(() => {
  if (!el.value) return
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!shown.value) {
            shown.value = true
            scheduleTimer(() => {
              visible.value = true
              if (!typed.value) {
                typed.value = true
                scheduleTimer(() => typewrite(), 300)
              }
            }, 80)
          } else {
            visible.value = true
          }
        } else if (shown.value) {
          visible.value = false
        }
      })
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  )
  observer.observe(el.value)
})

onUnmounted(() => {
  clearTimers()
  observer?.disconnect()
})
</script>

<template>
  <div
    ref="el"
    class="memory-node"
    :class="[side, { visible }]"
    :data-cat="thought.category"
  >
    <div class="node-dot" />
    <div class="node-line" />
    <div class="node-card">
      <div class="node-idx">#{{ index + 1 }}</div>
      <div class="cat-tag" :class="thought.category">
        <span>{{ catInfo.icon }}</span>
        <span>{{ catInfo.label }}</span>
      </div>
      <div class="node-time">{{ formatDate(thought.created) }}</div>
      <div class="typewriter-text">{{ textContent }}</div>
      <span class="typing-cursor" :class="{ active: cursorActive }" />
    </div>
  </div>
</template>

<style scoped>
.memory-node {
  position: relative;
  display: flex;
  align-items: flex-start;
  margin-bottom: 40px;
  opacity: 0;
  transform: translateX(0) scale(0.97);
  transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
.memory-node.left {
  flex-direction: row;
  padding-right: calc(50% + 30px);
}
.memory-node.right {
  flex-direction: row-reverse;
  padding-left: calc(50% + 30px);
}
.memory-node.visible {
  opacity: 1;
  transform: translateX(0) scale(1);
}

/* Node dot on timeline axis */
.node-dot {
  position: absolute;
  left: 50%;
  top: 24px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  transform: translateX(-50%);
  border: 3px solid var(--card-bg);
  box-shadow: 0 0 0 2px var(--lavender-light), 0 2px 8px var(--shadow);
  z-index: 2;
  transition: all 0.4s ease;
}
.memory-node.visible .node-dot {
  box-shadow: 0 0 0 3px var(--lavender), 0 2px 12px rgba(180, 160, 200, 0.3);
}
.memory-node[data-cat="feeling"] .node-dot { background: #FF8FAB; }
.memory-node[data-cat="reflection"] .node-dot { background: #A78BDB; }
.memory-node[data-cat="experience"] .node-dot { background: #6BCB9B; }
.memory-node[data-cat="plan"] .node-dot { background: #F5A673; }

/* Connection line */
.node-line {
  position: absolute;
  top: 30px;
  height: 2px;
  width: 30px;
  background: var(--lavender-light);
  z-index: 1;
}
.memory-node.left .node-line { right: calc(50% - 7px); }
.memory-node.right .node-line { left: calc(50% - 7px); }

/* Card */
.node-card {
  flex: 1;
  background: var(--card-bg);
  border-radius: 20px;
  padding: 24px 28px;
  box-shadow: 0 4px 24px var(--shadow), 0 0 0 1px rgba(255,255,255,0.8) inset;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.node-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 36px rgba(180, 160, 200, 0.22), 0 0 0 1px rgba(255,255,255,0.8) inset;
}

/* Card top color bar */
.node-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
}
.memory-node[data-cat="feeling"] .node-card::before { background: linear-gradient(90deg, #FFB5C2, #FF8FAB); }
.memory-node[data-cat="reflection"] .node-card::before { background: linear-gradient(90deg, #C5B3E6, #A78BDB); }
.memory-node[data-cat="experience"] .node-card::before { background: linear-gradient(90deg, #A8E6CF, #6BCB9B); }
.memory-node[data-cat="plan"] .node-card::before { background: linear-gradient(90deg, #FFD1A9, #F5A673); }

/* Category tag */
.cat-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 12px;
  border-radius: 16px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: 12px;
  letter-spacing: 1px;
}
.cat-tag.feeling { background: var(--pink-light); color: #D4668A; }
.cat-tag.reflection { background: var(--lavender-light); color: #7B5DB5; }
.cat-tag.experience { background: var(--mint-light); color: #3DA070; }
.cat-tag.plan { background: var(--peach-light); color: #C87D3A; }

/* Time */
.node-time {
  font-size: 0.72rem;
  color: var(--text-light);
  margin-bottom: 14px;
  letter-spacing: 1px;
}

/* Typewriter text */
.typewriter-text {
  font-size: 1.05rem;
  line-height: 1.9;
  color: var(--text);
  letter-spacing: 0.5px;
  min-height: 1.9em;
}

/* Cursor */
.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  background: var(--lavender);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 0.75s ease-in-out infinite;
  opacity: 0;
}
.typing-cursor.active { opacity: 1; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* Index badge */
.node-idx {
  position: absolute;
  top: 12px;
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: 0.65rem;
  color: var(--lavender-light);
}
.memory-node.left .node-idx { right: 16px; }
.memory-node.right .node-idx { left: 16px; }

/* Responsive */
@media (max-width: 768px) {
  .memory-node {
    margin-bottom: 24px;
  }
  .memory-node.left,
  .memory-node.right {
    flex-direction: row;
    padding-right: 0;
    padding-left: 44px;
    transform: translateY(20px);
  }
  .memory-node.visible { transform: translateY(0); }
  .node-dot { left: 16px; width: 12px; height: 12px; top: 20px; }
  .node-line { display: none; }
  .memory-node.left .node-idx,
  .memory-node.right .node-idx { right: 12px; left: auto; font-size: 0.6rem; }
  .node-card {
    padding: 16px 18px;
    border-radius: 16px;
  }
  .cat-tag {
    padding: 2px 10px;
    font-size: 0.65rem;
    margin-bottom: 8px;
  }
  .node-time { font-size: 0.65rem; margin-bottom: 10px; }
  .typewriter-text { font-size: 0.92rem; line-height: 1.75; }
}
</style>
