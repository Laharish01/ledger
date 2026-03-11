<!--
  EditModal — edit an existing transaction.
  Bottom sheet on mobile, centred dialog on desktop.
  v-model controls visibility. Emits: save(updates)

  NOTE: Uses separate date + time inputs instead of datetime-local.
  The datetime-local native widget has an intrinsic minimum width that
  causes horizontal overflow on narrow mobile screens and cannot be
  reliably overridden with CSS alone.
-->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="overlay"
        @click.self="$emit('update:modelValue', false)"
      >
        <div class="modal" role="dialog" aria-modal="true" aria-label="Edit transaction">

          <div class="modal-header">
            <h2 class="modal-title">Edit transaction</h2>
            <button class="close-btn" title="Close" @click="$emit('update:modelValue', false)">
              <SvgIcon :svg="iconClose" :size="14" />
            </button>
          </div>

          <div class="type-toggle">
            <button class="type-btn expense" :class="{ active: txType === 'expense' }" @click="txType = 'expense'">Expense</button>
            <button class="type-btn income"  :class="{ active: txType === 'income'  }" @click="txType = 'income'">Income</button>
          </div>

          <div class="fields">
            <div class="field">
              <label for="edit-amount">Amount</label>
              <input id="edit-amount" v-model="amount" type="number" min="0" step="0.01" placeholder="0.00" inputmode="decimal">
            </div>
            <div class="field">
              <label for="edit-category">Category</label>
              <input id="edit-category" v-model="category" type="text" placeholder="Food">
            </div>
            <div class="field">
              <label for="edit-date">Date</label>
              <input id="edit-date" v-model="datePart" type="date">
            </div>
            <div class="field">
              <label for="edit-time">Time</label>
              <input id="edit-time" v-model="timePart" type="time">
            </div>
            <div class="field full">
              <label for="edit-notes">Notes</label>
              <input id="edit-notes" v-model="notes" type="text" placeholder="Optional">
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-ghost" @click="$emit('update:modelValue', false)">Cancel</button>
            <button class="btn-primary" @click="save">Save changes</button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import SvgIcon        from './SvgIcon.vue'
import { iconClose }  from '../icons'

const props = defineProps({
  modelValue:  { type: Boolean, required: true },
  transaction: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'save'])

const txType   = ref('expense')
const amount   = ref('')
const category = ref('')
const notes    = ref('')
const datePart = ref('')   // YYYY-MM-DD
const timePart = ref('')   // HH:MM

watch(() => props.transaction, (tx) => {
  if (!tx) return
  txType.value   = tx.type
  amount.value   = tx.amount
  category.value = tx.category
  notes.value    = tx.notes ?? ''

  // Split ISO timestamp into local date + time parts
  const local = new Date(tx.created_at)
  const pad   = (n) => String(n).padStart(2, '0')
  datePart.value = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`
  timePart.value = `${pad(local.getHours())}:${pad(local.getMinutes())}`
}, { immediate: true })

function save() {
  if (!amount.value || !category.value || !datePart.value) return
  const isoString = new Date(`${datePart.value}T${timePart.value || '00:00'}`).toISOString()
  emit('save', {
    type:       txType.value,
    amount:     parseFloat(amount.value),
    category:   category.value.trim(),
    notes:      notes.value.trim(),
    created_at: isoString,
  })
  emit('update:modelValue', false)
}
</script>

<style scoped>
/*
  The overlay is teleported to <body> so it sits outside any scoped
  overflow context. We set overflow:hidden here so nothing inside
  can bleed beyond the viewport width.
*/
.overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  /* Clamp to exact viewport — nothing can overflow this box */
  width: 100vw;
  max-width: 100vw;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: var(--overlay);
  backdrop-filter: blur(6px);
}

@media (min-width: 640px) {
  .overlay {
    align-items: center;
    padding: 20px;
  }
}

.modal {
  /* box-sizing ensures padding never adds to declared width */
  box-sizing: border-box;
  width: 100%;
  /* Prevent any child (inputs, grid) from pushing width beyond the modal */
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  max-height: 92dvh;

  display: flex;
  flex-direction: column;
  gap: 14px;

  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px 20px 0 0;
}

@media (min-width: 640px) {
  .modal {
    width: min(420px, 100%);
    max-height: 90vh;
    padding: 24px;
    border-radius: 18px;
  }
}

/* ── Header ────────────────────────────────────────────────── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.modal-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1rem;
  font-weight: 600;
}
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--surface2);
  border: none;
  color: var(--text2);
  cursor: pointer;
  transition: color var(--transition);
}
.close-btn:hover { color: var(--text); }

/* ── Type toggle ───────────────────────────────────────────── */
.type-toggle { display: flex; gap: 6px; }
.type-btn {
  flex: 1;
  min-width: 0;
  padding: 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text2);
  cursor: pointer;
  transition: all var(--transition);
}
.type-btn.expense.active { background: var(--danger-dim);  border-color: var(--danger);  color: var(--danger); }
.type-btn.income.active  { background: var(--success-dim); border-color: var(--success); color: var(--success); }

/* ── Fields grid ───────────────────────────────────────────── */
.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  /* Prevent the grid from stretching the modal */
  min-width: 0;
  width: 100%;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;  /* allow grid cells to shrink; without this cells use content size */
}

.field.full { grid-column: 1 / -1; }

label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text2);
}

input {
  /* Critical: box-sizing + width:100% means the input exactly fills its cell */
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  color: var(--text);
  font-family: 'Inter', sans-serif;
  font-size: 16px;  /* prevents iOS auto-zoom */
  outline: none;
  transition: border-color var(--transition);
}
input:focus { border-color: var(--accent); }

/* ── Actions ───────────────────────────────────────────────── */
.modal-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.btn-ghost {
  flex: 1;
  min-width: 0;
  padding: 11px;
  background: var(--surface2);
  border: none;
  border-radius: var(--radius-sm);
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text2);
  cursor: pointer;
  transition: color var(--transition);
}
.btn-ghost:hover { color: var(--text); }
.btn-primary {
  flex: 2;
  min-width: 0;
  padding: 11px;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent-text);
  cursor: pointer;
  transition: opacity var(--transition);
}
.btn-primary:hover { opacity: 0.88; }

/* ── Transition ────────────────────────────────────────────── */
.modal-enter-active, .modal-leave-active { transition: all 0.22s ease; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(40px); opacity: 0; }
</style>
