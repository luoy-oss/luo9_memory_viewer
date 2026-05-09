<script setup lang="ts">
const props = defineProps<{
  date: string
  dateKey?: string
}>()

const el = ref<HTMLElement>()
const visible = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!el.value) return
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        visible.value = entry.isIntersecting
      })
    },
    { threshold: 0.15 },
  )
  observer.observe(el.value)
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <div ref="el" :id="dateKey ? `date-${dateKey}` : undefined" class="date-separator" :class="{ visible }">
    <span class="date-label">{{ date }}</span>
  </div>
</template>

<style scoped>
.date-separator {
  position: relative;
  text-align: center;
  margin: 50px 0 30px;
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
.date-separator.visible {
  opacity: 1;
  transform: scale(1);
}
.date-label {
  display: inline-block;
  background: var(--card-bg);
  padding: 6px 24px;
  border-radius: 20px;
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: 0.85rem;
  color: var(--text-light);
  box-shadow: 0 2px 12px var(--shadow);
  letter-spacing: 2px;
  position: relative;
  z-index: 1;
}

@media (max-width: 768px) {
  .date-separator { margin: 30px 0 20px; }
  .date-label { padding: 5px 18px; font-size: 0.75rem; letter-spacing: 1px; }
}
</style>
