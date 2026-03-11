<!--
  EditModal — edit an existing transaction.
  Bottom sheet on mobile, centred dialog on desktop.
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
            <div class="field full">
              <label for="edit-date">Date</label>
              <input id="edit-date" v-model="datePart" type="date">
            </div>
            <div class="field full">
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
const datePart = ref('')
const timePart = ref('')

watch(() => props.transaction, (tx) => {
  if (!tx) return
  txType.value   = tx.type
  amount.value   = tx.amount
  category.value = tx.category
  notes.value    = tx.notes ?? ''
  const local = new Date(tx.created_at)
  const pad   = n => String(n).padStart(2, '0')
  datePart.value = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`
  timePart.value = `${pad(local.getHours())}:${pad(local.getMinutes())}`
}, { immediate: true })

function save() {
  if (!amount.value || !category.value || !datePart.value) return
  emit('save', {
    type:       txType.value,
    amount:     parseFloat(amount.value),
    category:   category.value.trim(),
    notes:      notes.value.trim(),
    created_at: new Date(`${datePart.value}T${timePart.value || '00:00'}`).toISOString(),
  })
  emit('update:modelValue', false)
}
</script>

<style scoped>
/*
  iOS Safari ignores overflow-x:hidden on body/html and position:fixed elements
  escape their parent's overflow clip entirely. The only reliable strategy is to
  make every element's width genuinely never exceed the viewport — no clipping needed.

  Key rules:
  - overlay: position:fixed inset:0 gives it exact viewport bounds; no width needed
  - modal: width uses min() so it cannot exceed 100svw (small viewport width on iOS)
  - every child: box-sizing:border-box + width:100% + min-width:0
*/
.overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: var(--overlay);
  backdrop-filter: blur(6px);
}

@media (min-width: 640px) {
  .overlay { align-items: center; padding: 20px; }
}

.modal {
  /* svw = small viewport width — the stable iOS Safari unit that excludes
     the browser chrome. Falls back to vw in browsers that don't support it. */
  width: min(100svw, 100%);
  max-width: 100svw;
  box-sizing: border-box;
  min-width: 0;

  max-height: 92svh;
  overflow-y: auto;

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
    width: min(420px, 100svw);
    max-height: 90svh;
    padding: 24px;
    border-radius: 18px;
  }
}

/* ── Header ──────────────────────────────────────────────── */
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

/* ── Type toggle ─────────────────────────────────────────── */
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

/* ── Fields ──────────────────────────────────────────────── */
.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  /* Must not set an explicit width here — let the grid conform to .modal */
  min-width: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  /* min-width:0 lets grid cells shrink below their content's intrinsic size */
  min-width: 0;
}
.field.full { grid-column: 1 / -1; }

label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text2);
  white-space: nowrap;
}

input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  /* max-width keeps the input inside its grid cell on any screen */
  max-width: 100%;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 8px;
  color: var(--text);
  font-family: 'Inter', sans-serif;
  font-size: 16px;   /* prevents iOS auto-zoom */
  outline: none;
  /* Clip any browser-native widget chrome that exceeds the input's box */
  overflow: hidden;
  transition: border-color var(--transition);
}
input:focus { border-color: var(--accent); }

/* ── Actions ─────────────────────────────────────────────── */
.modal-actions { display: flex; gap: 8px; flex-shrink: 0; }
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

/* ── Transition ──────────────────────────────────────────── */
.modal-enter-active, .modal-leave-active { transition: all 0.22s ease; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(40px); opacity: 0; }
</style>
