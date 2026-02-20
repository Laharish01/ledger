<template>
  <Teleport to="body">
    <div class="toast" :class="[type, { show: visible }]">{{ message }}</div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const visible = ref(false)
const message = ref('')
const type    = ref('success')
let timer = null

function show(msg, t = 'success') {
  message.value = msg
  type.value    = t
  visible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => visible.value = false, 3000)
}

defineExpose({ show })
</script>

<style scoped>
.toast {
  position: fixed; bottom: 24px; right: 24px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 12px 18px; font-size: 0.8rem;
  z-index: 2000; transform: translateY(80px); opacity: 0;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); max-width: 300px;
  pointer-events: none;
}
.toast.show    { transform: translateY(0); opacity: 1; }
.toast.success { border-color: rgba(74,222,128,0.4);  color: var(--success); }
.toast.error   { border-color: rgba(255,95,109,0.4);  color: var(--danger); }
</style>
