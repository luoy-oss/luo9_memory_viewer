<script setup lang="ts">
import type { Thought } from '~/composables/useThoughts'

const props = defineProps<{
  thoughts: Thought[]
  loading: boolean
}>()

function dateKey(ts: number) {
  const d = new Date(ts * 1000)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function dateLabel(ts: number) {
  const d = new Date(ts * 1000)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${m}月${day}日 星期${w}`
}

type TimelineItem = {
  type: 'date'
  key: string
  date: string
  dateKey: string
  ts: number
} | {
  type: 'thought'
  key: string
  thought: Thought
  index: number
}

const timelineItems = computed(() => {
  const items: TimelineItem[] = []
  let lastDate = ''

  props.thoughts.forEach((t, i) => {
    const dk = dateKey(t.created)
    if (dk !== lastDate) {
      lastDate = dk
      items.push({
        type: 'date',
        key: `date-${dk}`,
        date: dateLabel(t.created),
        dateKey: dk,
        ts: t.created,
      })
    }
    items.push({
      type: 'thought',
      key: `thought-${t.id || i}`,
      thought: t,
      index: i,
    })
  })

  return items
})
</script>

<template>
  <div class="timeline">
    <template v-if="!loading">
      <template v-for="item in timelineItems" :key="item.key">
        <DateSeparator v-if="item.type === 'date'" :date="item.date" :date-key="item.dateKey" />
        <MemoryCard
          v-else
          :thought="item.thought"
          :index="item.index"
        />
      </template>
    </template>
  </div>
</template>

<style scoped>
.timeline {
  position: relative;
  z-index: 2;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px 100px;
}

/* Center axis line */
.timeline::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, var(--pink-light), var(--lavender-light), var(--mint-light), var(--peach-light));
  transform: translateX(-50%);
  border-radius: 2px;
}

@media (max-width: 768px) {
  .timeline::before { left: 20px; }
}
</style>
