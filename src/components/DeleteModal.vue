<template>
  <div class="modal-overlay" :class="{ open: modelValue }" @click="$emit('update:modelValue', false)">
    <div class="modal">
      <div class="modal-title">Are you sure?</div>
      <div class="modal-actions">
        <button class="modal-btn secondary" @click="$emit('update:modelValue', false)">Cancel</button>
        <button class="modal-btn primary" @click="handleDelete">Yes</button>
      </div>
    </div>
  </div>

  <Toast ref="toast" />
</template>

<script setup>
import { useTransactionStore } from '../stores/transactions'
import Toast           from '../components/Toast.vue'
import { ref } from 'vue'

const txStore  = useTransactionStore()
const toast       = ref(null)

function showToast({ msg, type }) { toast.value?.show(msg, type) }

const props = defineProps({
  modelValue: Boolean,
  transaction: String,
})
const emit = defineEmits(['update:modelValue'])

async function handleDelete() {
  try {
    await txStore.remove(props.transaction)
    showToast({ msg: 'Deleted', type: 'success' })
    txStore.loadStats()
  } catch {
    showToast({ msg: 'Delete failed — rolled back', type: 'error' })
  }
}

</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: var(--overlay);
  z-index: 500; display: flex; align-items: center; justify-content: center;
  padding: 20px; opacity: 0; pointer-events: none;
  transition: opacity 0.2s; backdrop-filter: blur(4px);
}
.modal-overlay.open { opacity: 1; pointer-events: all; }

.modal {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 16px; padding: 28px; width: 100%; max-width: 420px;
  transform: translateY(16px);
  transition: transform 0.25s cubic-bezier(0.34,1.4,0.64,1);
}
.modal-overlay.open .modal { transform: translateY(0); }

.modal-title { font-family: 'Roboto Slab', serif; font-size: 1.3rem; margin-bottom: 20px; }

.field { margin-bottom: 14px; }
.field label { display: block; font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 5px; }
.field input {
  width: 100%; background: var(--bg); border: 1px solid var(--border);
  border-radius: 8px; padding: 10px 12px; color: var(--text);
  font-family: 'Roboto', sans-serif; font-size: 16px;
  outline: none; transition: border-color 0.2s;
}
.field input:focus { border-color: var(--accent); }

.type-toggle { display: flex; gap: 6px; }
.type-opt {
  flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--border);
  background: none; font-family: 'Roboto', sans-serif; font-size: 0.75rem;
  cursor: pointer; color: var(--muted); transition: all 0.2s; text-align: center;
}
.type-opt.active.expense { background: rgba(255,95,109,0.15); border-color: var(--danger); color: var(--danger); }
.type-opt.active.income  { background: rgba(74,222,128,0.15);  border-color: var(--success); color: var(--success); }

.modal-actions { display: flex; gap: 10px; margin-top: 20px; }
.modal-btn {
  flex: 1; padding: 11px; border-radius: 8px; border: none;
  font-family: 'Roboto', sans-serif; font-size: 0.8rem;
  letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer;
  transition: all 0.2s; font-weight: 500;
}
.modal-btn.primary   { background: var(--accent); color: var(--accent-text); }
.modal-btn.primary:hover { opacity: 0.9; }
.modal-btn.secondary { background: var(--border); color: var(--muted); }
.modal-btn.secondary:hover { color: var(--text); }

@media (max-width: 768px) {
  .modal { margin: 0 8px; }
  .modal-actions { flex-direction: column; }
}
</style>
