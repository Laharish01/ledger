<!--
  EditModal — edit an existing transaction.
  Bottom sheet on mobile, centred dialog on desktop.
  v-model controls visibility.
  Emits: save(updates)
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

          <!-- Header -->
          <div class="modal-header">
            <h2 class="modal-title">Edit transaction</h2>
            <button class="close-btn" title="Close" @click="$emit('update:modelValue', false)">
              <SvgIcon :svg="iconClose" :size="14" />
            </button>
          </div>

          <!-- Type toggle -->
          <div class="type-toggle">
            <button
              class="type-btn expense"
              :class="{ active: txType === 'expense' }"
              @click="txType = 'expense'"
            >Expense</button>
            <button
              class="type-btn income"
              :class="{ active: txType === 'income' }"
              @click="txType = 'income'"
            >Income</button>
          </div>

          <!-- Fields grid -->
          <div class="fields">
            <div class="field">
              <label for="edit-amount">Amount</label>
              <input id="edit-amount" v-model="amount" type="number" min="0" step="0.01" placeholder="0.00">
            </div>
            <div class="field">
              <label for="edit-category">Category</label>
              <input id="edit-category" v-model="category" type="text" placeholder="Food">
            </div>
            <div class="field full">
              <label for="edit-notes">Notes</label>
              <input id="edit-notes" v-model="notes" type="text" placeholder="Optional">
            </div>
            <div class="field full">
              <label for="edit-date">Date</label>
              <input id="edit-date" v-model="date" type="datetime-local">
            </div>
          </div>

          <!-- Actions -->
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
import SvgIcon from './SvgIcon.vue'
import { iconClose } from '../icons'

// ── Props / emits ────────────────────────────────────────────────────────────

const props = defineProps({
  modelValue:  { type: Boolean, required: true },
  transaction: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'save'])

// ── Form state ────────────────────────────────────────────────────────────────

const txType   = ref('expense')
const amount   = ref('')
const category = ref('')
const notes    = ref('')
const date     = ref('')

/** Populate form whenever the modal opens with a new transaction. */
watch(() => props.transaction, (tx) => {
  if (!tx) return
  txType.value   = tx.type
  amount.value   = tx.amount
  category.value = tx.category
  notes.value    = tx.notes ?? ''

  // Convert UTC ISO to local datetime-local string
  const d = new Date(tx.created_at)
  date.value = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}, { immediate: true })

// ── Submit ─────────────────────────────────────────────────────────────────────

function save() {
  if (!amount.value || !category.value || !date.value) return

  emit('save', {
    type:       txType.value,
    amount:     parseFloat(amount.value),
    category:   category.value.trim(),
    notes:      notes.value.trim(),
    created_at: new Date(date.value).toISOString(),
  })

  emit('update:modelValue', false)
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  z-index: 500;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  backdrop-filter: blur(6px);
}
@media (min-width: 640px) {
  .overlay { align-items: center; padding: 20px; }
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px 20px 0 0;
  padding: 24px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
@media (min-width: 640px) {
  .modal { border-radius: 18px; max-width: 420px; }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

/* Type toggle */
.type-toggle { display: flex; gap: 6px; }
.type-btn {
  flex: 1;
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

/* Fields grid — 2 columns, with .full spanning both */
.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.field { display: flex; flex-direction: column; gap: 5px; }
.field.full { grid-column: 1 / -1; }

label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text2);
}

input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  color: var(--text);
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  outline: none;
  transition: border-color var(--transition);
}
input:focus { border-color: var(--accent); }

/* Actions */
.modal-actions { display: flex; gap: 8px; }
.btn-ghost {
  flex: 1;
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

.modal-enter-active, .modal-leave-active { transition: all 0.22s ease; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(40px); opacity: 0; }
</style>
