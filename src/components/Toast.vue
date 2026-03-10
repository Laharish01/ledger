<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast" :class="type">{{ message }}</div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
const visible = ref(false)
const message = ref('')
const type    = ref('success')
let timer = null

function show(msg, t = 'success') {
  message.value = msg; type.value = t; visible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => visible.value = false, 3000)
}
defineExpose({ show })
</script>

<style scoped>
.toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  background: var(--surface2); border: 1px solid var(--border2);
  border-radius: 100px; padding: 9px 18px; font-size: 0.78rem; font-weight: 500;
  z-index: 2000; white-space: nowrap; pointer-events: none;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
.toast.success { border-color: rgba(61,214,140,0.4); color: var(--success); }
.toast.error   { border-color: rgba(247,82,90,0.4);  color: var(--danger); }

.toast-enter-active, .toast-leave-active { transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(12px); }

@media (max-width: 640px) {
  .toast { bottom: calc(56px + 70px + 8px); }
}
</style>
