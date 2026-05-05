<script setup lang="ts">
import { CATEGORY_MAP, type StatsResponse } from '~/composables/useThoughts'

const props = defineProps<{
  stats: StatsResponse | null
  loading: boolean
}>()

const categories = ['feeling', 'reflection', 'experience', 'plan'] as const
</script>

<template>
  <div v-if="stats && !loading" class="counter">
    <div v-for="cat in categories" :key="cat" class="counter-item" :class="cat">
      <div class="num">{{ stats[cat] }}</div>
      <div class="label">{{ CATEGORY_MAP[cat]?.icon }} {{ CATEGORY_MAP[cat]?.label }}</div>
    </div>
    <div class="counter-item">
      <div class="num total-num">{{ stats.total }}</div>
      <div class="label">📝 全部</div>
    </div>
  </div>
</template>

<style scoped>
.counter {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 0 20px 50px;
  position: relative;
  z-index: 2;
}
.counter-item {
  text-align: center;
  padding: 14px 22px;
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: 0 4px 20px var(--shadow);
  min-width: 80px;
}
.counter-item .num {
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: 1.6rem;
  line-height: 1;
}
.counter-item .label {
  font-size: 0.7rem;
  color: var(--text-light);
  margin-top: 4px;
}
.counter-item.feeling .num { color: #FF8FAB; }
.counter-item.reflection .num { color: #A78BDB; }
.counter-item.experience .num { color: #6BCB9B; }
.counter-item.plan .num { color: #F5A673; }
.total-num { color: var(--text) !important; }
</style>
