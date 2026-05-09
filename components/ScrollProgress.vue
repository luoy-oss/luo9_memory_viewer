<script setup lang="ts">
const progress = ref(0)
const showBackTop = ref(false)

function onScroll() {
  const scrollTop = window.scrollY
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  progress.value = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
  showBackTop.value = scrollTop > 500
}

function backToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div>
    <div class="scroll-progress" :style="{ width: progress + '%' }" />
    <Transition name="pop">
      <button v-if="showBackTop" class="back-top" title="回到顶部" @click="backToTop">
        ↑
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--pink), var(--lavender), var(--mint));
  background-size: 200% 100%;
  animation: gradientShift 4s ease infinite;
  z-index: 100;
  transition: width 0.15s linear;
}
@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.back-top {
  position: fixed;
  bottom: 30px;
  right: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--card-bg);
  border: 2px solid var(--lavender-light);
  box-shadow: 0 4px 16px var(--shadow);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: var(--text-light);
  z-index: 50;
}
.back-top:hover {
  border-color: var(--lavender);
  color: var(--lavender);
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .back-top {
    width: 40px;
    height: 40px;
    bottom: 20px;
    right: 12px;
    font-size: 1rem;
  }
}

.pop-enter-active, .pop-leave-active {
  transition: all 0.3s ease;
}
.pop-enter-from, .pop-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
