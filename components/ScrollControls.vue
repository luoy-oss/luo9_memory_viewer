<script setup lang="ts">
const floatEnabled = ref(true)

const emit = defineEmits<{
  toggleFloat: [enabled: boolean]
}>()

function toggleFloat() {
  floatEnabled.value = !floatEnabled.value
  emit('toggleFloat', floatEnabled.value)
}

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
        :class="{ active: floatEnabled }"
        title="浮动文字"
        @click="toggleFloat"
      >
        💭
      </button>
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

@media (max-width: 768px) {
  .control-bar {
    right: 12px;
    padding: 10px 8px;
    border-radius: 22px;
  }
  .ctrl-btn {
    width: 36px;
    height: 36px;
    font-size: 0.9rem;
  }
}
</style>
