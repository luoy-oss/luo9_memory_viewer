<script setup lang="ts">
import type { Thought } from '~/composables/useThoughts'

const props = defineProps<{
  thoughts: Thought[]
}>()

const emit = defineEmits<{
  (e: 'jump', dateKey: string): void
}>()

const open = ref(false)
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth()) // 0-indexed

// dateKey -> count
const dailyCounts = computed(() => {
  const map: Record<string, number> = {}
  for (const t of props.thoughts) {
    const d = new Date(t.created * 1000)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    map[key] = (map[key] || 0) + 1
  }
  return map
})

// Date range of all thoughts
const dateRange = computed(() => {
  if (props.thoughts.length === 0) return null
  const first = new Date(props.thoughts[0].created * 1000)
  const last = new Date(props.thoughts[props.thoughts.length - 1].created * 1000)
  return { min: first, max: last }
})

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

interface CalendarDay {
  day: number
  dateKey: string
  count: number
  isToday: boolean
  isCurrentMonth: boolean
  isFuture: boolean
}

const calendarDays = computed<CalendarDay[]>(() => {
  const year = viewYear.value
  const month = viewMonth.value
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
  const todayTs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() / 1000

  const days: CalendarDay[] = []

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = month === 0 ? 12 : month
    const y = month === 0 ? year - 1 : year
    const key = `${y}-${m}-${d}`
    days.push({ day: d, dateKey: key, count: dailyCounts.value[key] || 0, isToday: false, isCurrentMonth: false, isFuture: false })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${month + 1}-${d}`
    const dayTs = new Date(year, month, d).getTime() / 1000
    days.push({
      day: d,
      dateKey: key,
      count: dailyCounts.value[key] || 0,
      isToday: key === todayKey,
      isCurrentMonth: true,
      isFuture: dayTs > todayTs,
    })
  }

  // Next month leading days (fill to 42 cells = 6 rows)
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 1 : month + 2
    const y = month === 11 ? year + 1 : year
    const key = `${y}-${m}-${d}`
    days.push({ day: d, dateKey: key, count: dailyCounts.value[key] || 0, isToday: false, isCurrentMonth: false, isFuture: false })
  }

  return days
})

const monthLabel = computed(() => `${viewYear.value}年${viewMonth.value + 1}月`)

const hasPrevMonth = computed(() => {
  if (!dateRange.value) return false
  const min = dateRange.value.min
  return viewYear.value > min.getFullYear() || (viewYear.value === min.getFullYear() && viewMonth.value > min.getMonth())
})

const hasNextMonth = computed(() => {
  if (!dateRange.value) return false
  const max = dateRange.value.max
  return viewYear.value < max.getFullYear() || (viewYear.value === max.getFullYear() && viewMonth.value < max.getMonth())
})

function prevMonth() {
  if (!hasPrevMonth.value) return
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

function nextMonth() {
  if (!hasNextMonth.value) return
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

function jumpToToday() {
  const today = new Date()
  viewYear.value = today.getFullYear()
  viewMonth.value = today.getMonth()
}

function selectDay(day: CalendarDay) {
  if (day.isFuture || day.count === 0) return
  const dateKey = day.dateKey
  open.value = false
  // 等待抽屉关闭动画结束后再跳转，避免布局变化干扰滚动位置
  setTimeout(() => emit('jump', dateKey), 400)
}

function toggle() {
  open.value = !open.value
}

// Initialize view to latest month with thoughts
watch(() => props.thoughts, (t) => {
  if (t.length > 0) {
    const last = new Date(t[t.length - 1].created * 1000)
    viewYear.value = last.getFullYear()
    viewMonth.value = last.getMonth()
  }
}, { immediate: true })
</script>

<template>
  <!-- Toggle button -->
  <button class="calendar-toggle" :class="{ active: open }" @click="toggle" title="记忆日历">
    <span class="toggle-icon">📅</span>
  </button>

  <!-- Backdrop -->
  <Transition name="fade">
    <div v-if="open" class="calendar-backdrop" @click="open = false" />
  </Transition>

  <!-- Drawer -->
  <Transition name="slide">
    <div v-if="open" class="calendar-drawer">
      <div class="drawer-header">
        <h3 class="drawer-title">记忆日历</h3>
        <button class="close-btn" @click="open = false">&times;</button>
      </div>

      <!-- Month navigation -->
      <div class="month-nav">
        <button class="nav-btn" :disabled="!hasPrevMonth" @click="prevMonth">&lsaquo;</button>
        <span class="month-label" @click="jumpToToday">{{ monthLabel }}</span>
        <button class="nav-btn" :disabled="!hasNextMonth" @click="nextMonth">&rsaquo;</button>
      </div>

      <!-- Week headers -->
      <div class="week-header">
        <span v-for="w in weekDays" :key="w" class="week-day">{{ w }}</span>
      </div>

      <!-- Day grid -->
      <div class="day-grid">
        <button
          v-for="(d, i) in calendarDays"
          :key="i"
          class="day-cell"
          :class="{
            today: d.isToday,
            'other-month': !d.isCurrentMonth,
            future: d.isFuture,
            'has-memories': d.count > 0,
          }"
          @click="selectDay(d)"
        >
          <span class="day-num">{{ d.day }}</span>
          <span v-if="d.count > 0" class="day-count">{{ d.count }}</span>
        </button>
      </div>

      <!-- Legend -->
      <div class="legend">
        <span class="legend-dot" /> 有记忆的日子
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Toggle button */
.calendar-toggle {
  position: fixed;
  right: 20px;
  bottom: 100px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--card-bg);
  border: 2px solid var(--lavender-light);
  box-shadow: 0 4px 16px var(--shadow);
  cursor: pointer;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
.calendar-toggle:hover {
  border-color: var(--lavender);
  transform: scale(1.1);
  box-shadow: 0 6px 24px rgba(180, 160, 200, 0.3);
}
.calendar-toggle.active {
  border-color: var(--lavender);
  background: var(--lavender-light);
}
.toggle-icon { font-size: 1.3rem; }

/* Backdrop */
.calendar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(90, 74, 107, 0.15);
  z-index: 95;
  backdrop-filter: blur(2px);
}

/* Drawer */
.calendar-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 340px;
  max-width: 90vw;
  height: 100vh;
  background: var(--bg);
  box-shadow: -4px 0 30px rgba(180, 160, 200, 0.2);
  z-index: 100;
  padding: 24px 20px;
  overflow-y: auto;
}

/* Header */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.drawer-title {
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: 1.1rem;
  color: var(--text);
  letter-spacing: 2px;
}
.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 1.4rem;
  color: var(--text-light);
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s;
}
.close-btn:hover {
  background: var(--lavender-light);
  color: var(--text);
}

/* Month nav */
.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.nav-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--lavender-light);
  background: var(--card-bg);
  border-radius: 12px;
  font-size: 1.2rem;
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-btn:hover:not(:disabled) {
  border-color: var(--lavender);
  color: var(--lavender);
}
.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.month-label {
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: 1rem;
  color: var(--text);
  letter-spacing: 2px;
  cursor: pointer;
  transition: color 0.2s;
}
.month-label:hover {
  color: var(--lavender);
}

/* Week header */
.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 8px;
}
.week-day {
  text-align: center;
  font-size: 0.7rem;
  color: var(--text-light);
  padding: 4px 0;
  font-weight: 600;
  letter-spacing: 1px;
}

/* Day grid */
.day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}
.day-cell {
  position: relative;
  aspect-ratio: 1;
  border: none;
  background: var(--card-bg);
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  transition: all 0.2s;
  padding: 4px;
}
.day-cell:hover:not(.future):not(.other-month) {
  transform: scale(1.08);
  box-shadow: 0 2px 12px var(--shadow);
}
.day-cell.other-month {
  opacity: 0.3;
}
.day-cell.future {
  opacity: 0.25;
  cursor: not-allowed;
}
.day-cell.has-memories {
  background: var(--lavender-light);
}
.day-cell.has-memories:hover:not(.future) {
  background: #d8cbf5;
}
.day-cell.today {
  border: 2px solid var(--lavender);
  box-shadow: 0 0 0 2px rgba(197, 179, 230, 0.3);
}
.day-num {
  font-size: 0.78rem;
  color: var(--text);
  line-height: 1;
}
.day-cell.today .day-num {
  font-weight: 700;
  color: #7B5DB5;
}
.day-count {
  font-size: 0.55rem;
  color: #7B5DB5;
  font-weight: 700;
  line-height: 1;
}

/* Legend */
.legend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  font-size: 0.7rem;
  color: var(--text-light);
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 4px;
  background: var(--lavender-light);
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile */
@media (max-width: 768px) {
  .calendar-drawer {
    width: 100vw;
    max-width: 100vw;
    padding: 20px 16px;
  }
  .calendar-toggle {
    bottom: 80px;
    right: 12px;
    width: 42px;
    height: 42px;
  }
  .day-cell { border-radius: 10px; }
  .day-num { font-size: 0.7rem; }
  .day-count { font-size: 0.5rem; }
}
</style>
