<!--
  App.vue — root component.
  Handles: theme, login flow, tab switching, delete confirmation, toasts.
  No router — single-page with conditional rendering.
-->
<template>
  <div :data-theme="theme" class="shell">

    <!-- ══════════════════════════════════════════════════════
         LOGIN PAGE
    ══════════════════════════════════════════════════════ -->
    <div v-if="!auth.loggedIn" class="login-page">

      <button class="theme-toggle" :title="theme === 'dark' ? 'Light mode' : 'Dark mode'" @click="toggleTheme">
        <SvgIcon :svg="theme === 'dark' ? iconSun : iconMoon" :size="15" />
      </button>

      <!-- Ambient orbs -->
      <div class="orb orb1" />
      <div class="orb orb2" />

      <div class="login-wrap">
        <!-- Brand -->
        <div class="login-brand">
          <div class="login-logo">L</div>
          <h1>Ledger</h1>
          <p>Private finance tracking</p>
        </div>

        <!-- Auth card -->
        <div class="card">
          <Transition name="fade" mode="out-in">

            <!-- Panel: choose action -->
            <div v-if="loginPanel === 'home'" key="home" class="panel-stack">
              <button class="btn-primary" @click="initCreate">Create new account</button>
              <div class="or-divider"><span>or</span></div>
              <button class="btn-ghost" @click="loginPanel = 'login'">Sign in with Account ID</button>
            </div>

            <!-- Panel: show generated ID, confirm creation -->
            <div v-else-if="loginPanel === 'create'" key="create" class="panel-stack">
              <div class="id-display">
                <div class="id-label">Your Account ID</div>
                <div class="id-value">{{ generatedId }}</div>
                <button class="id-copy" @click="copyGeneratedId">
                  <SvgIcon :svg="idCopied ? iconCheck : iconCopy" :size="13" />
                  {{ idCopied ? 'Copied' : 'Copy' }}
                </button>
              </div>
              <div class="warning-note">
                <SvgIcon :svg="iconWarn" :size="14" class="warn-icon" />
                Save this ID — it's your only way back in. We can't recover it.
              </div>
              <button class="btn-primary" :disabled="loginLoading" @click="doCreate">
                {{ loginLoading ? 'Creating…' : 'Create & sign in' }}
              </button>
              <button class="btn-ghost" @click="loginPanel = 'home'">Back</button>
            </div>

            <!-- Panel: sign in with existing ID -->
            <div v-else key="login" class="panel-stack">
              <div class="field-group">
                <label for="account-id-input">Account ID</label>
                <input
                  id="account-id-input"
                  v-model="loginId"
                  type="text"
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  spellcheck="false"
                  autocomplete="off"
                  @keydown.enter="doLogin"
                >
              </div>
              <p v-if="loginError" class="error-msg">{{ loginError }}</p>
              <button class="btn-primary" :disabled="loginLoading" @click="doLogin">
                {{ loginLoading ? 'Signing in…' : 'Sign in' }}
              </button>
              <button class="btn-ghost" @click="loginPanel = 'home'">Back</button>
            </div>

          </Transition>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════
         APP SHELL (authenticated)
    ══════════════════════════════════════════════════════ -->
    <div v-else class="app-shell">

      <!-- Top bar -->
      <header class="topbar">
        <div class="topbar-brand">Ledger</div>

        <div class="topbar-right">
          <!-- Account ID chip (click to copy) -->
          <button class="id-chip" :title="accountIdCopied ? 'Copied!' : 'Click to copy Account ID'" @click="copyAccountId">
            <SvgIcon :svg="accountIdCopied ? iconCheck : iconCopy" :size="12" />
            {{ accountIdCopied ? 'Copied' : auth.accountId }}
          </button>

          <!-- Desktop tab pills -->
          <nav class="desk-tabs" aria-label="Main navigation">
            <button
              class="desk-tab"
              :class="{ active: activeTab === 'home' }"
              @click="activeTab = 'home'"
            >Home</button>
            <button
              class="desk-tab"
              :class="{ active: activeTab === 'analytics' }"
              @click="activeTab = 'analytics'"
            >Analytics</button>
          </nav>

          <!-- Settings -->
          <button class="icon-btn" title="Settings" @click="showSettings = true">
            <SvgIcon :svg="iconSettings" :size="15" />
          </button>

          <!-- Theme toggle -->
          <button class="icon-btn" :title="theme === 'dark' ? 'Light mode' : 'Dark mode'" @click="toggleTheme">
            <SvgIcon :svg="theme === 'dark' ? iconSun : iconMoon" :size="15" />
          </button>

          <!-- Sign out (desktop) -->
          <button class="topbar-logout" @click="logout">
            <SvgIcon :svg="iconLogout" :size="14" />
            Sign out
          </button>
        </div>
      </header>

      <!-- Tab content -->
      <main class="content">
        <Transition name="tab-fade" mode="out-in">

          <!-- ── Home ─────────────────────────────────────────── -->
          <div v-if="activeTab === 'home'" key="home" class="tab-pane">

            <!-- Stat cards -->
            <div class="stats-row">
              <div class="stat-card">
                <div class="stat-header">
                  <SvgIcon :svg="iconExpense" :size="14" class="stat-icon expense" />
                  <span class="stat-label">This month</span>
                </div>
                <div class="stat-amount expense">{{ fmt(txStore.stats.monthExpenses) }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-header">
                  <SvgIcon :svg="iconIncome" :size="14" class="stat-icon income" />
                  <span class="stat-label">This month</span>
                </div>
                <div class="stat-amount income">{{ fmt(txStore.stats.monthIncome) }}</div>
              </div>
            </div>

            <!-- Period filter -->
            <PeriodFilter
              :active-period="txStore.activePeriod"
              @change="handlePeriodChange"
            />

            <!-- Transaction list -->
            <div class="tx-list">
              <div v-if="listLoading" class="list-state">
                <div class="spinner" />
              </div>
              <div v-else-if="!txStore.txList.length" class="list-state">
                <div class="empty-icon">💸</div>
                <p>No transactions yet</p>
              </div>
              <template v-else>
                <TransactionItem
                  v-for="tx in txStore.txList"
                  :key="tx.id"
                  :tx="tx"
                  @edit="openEdit"
                  @delete="requestDelete"
                />
                <button v-if="txStore.hasMore" class="load-more-btn" @click="txStore.loadMore()">
                  Load more
                </button>
              </template>
            </div>

            <!-- Fixed input bar -->
            <div class="input-area" :style="{ transform: `translateY(-${inputBarOffset}px)` }">
              <div class="input-inner">
                <TransactionInput @submit="handleAdd" />
              </div>
            </div>

          </div>

          <!-- ── Analytics ────────────────────────────────────── -->
          <div v-else key="analytics" class="tab-pane">
            <AnalyticsPane :currency="settings.currency" />
          </div>

        </Transition>
      </main>

      <!-- Mobile bottom nav -->
      <nav class="mobile-nav" aria-label="Mobile navigation">
        <button
          class="mobile-tab"
          :class="{ active: activeTab === 'home' }"
          @click="activeTab = 'home'"
        >
          <SvgIcon :svg="iconHome" :size="18" />
          <span class="mobile-tab-label">Home</span>
        </button>
        <button
          class="mobile-tab"
          :class="{ active: activeTab === 'analytics' }"
          @click="activeTab = 'analytics'"
        >
          <SvgIcon :svg="iconChart" :size="18" />
          <span class="mobile-tab-label">Analytics</span>
        </button>
        <button class="mobile-tab logout-tab" @click="logout">
          <SvgIcon :svg="iconLogout" :size="18" />
          <span class="mobile-tab-label">Sign out</span>
        </button>
      </nav>

    </div>

    <!-- ══════════════════════════════════════════════════════
         GLOBAL MODALS
    ══════════════════════════════════════════════════════ -->

    <EditModal
      v-model="showEdit"
      :transaction="editingTx"
      @save="handleEditSave"
    />

    <SettingsModal
      v-model="showSettings"
      @toast="showToast"
      @import-done="onImportDone"
      @open-accounts="showSettings = false; showAccounts = true"
    />

    <!-- Delete confirmation -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="deleteTarget"
          class="modal-overlay"
          @click.self="deleteTarget = null"
        >
          <div class="confirm-modal" role="alertdialog" aria-modal="true">
            <div class="confirm-icon">
              <SvgIcon :svg="iconTrash" :size="22" />
            </div>
            <h2 class="confirm-title">Delete transaction?</h2>
            <p class="confirm-body">
              <strong>{{ deleteTarget.category }}</strong>
              &nbsp;{{ deleteTarget.type === 'expense' ? '−' : '+' }}{{ fmt(deleteTarget.amount) }}
              &nbsp;·&nbsp;{{ timeAgo(deleteTarget.created_at) }}
            </p>
            <div class="confirm-actions">
              <button class="modal-btn secondary" @click="deleteTarget = null">Cancel</button>
              <button class="modal-btn danger" @click="executeDelete">Delete</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <AccountsModal v-model="showAccounts" />
    <Toast ref="toastRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useAuthStore }        from './stores/auth'
import { useSourcesStore }     from './stores/sources'
import { useSettingsStore }    from './stores/settings'
import { useTransactionStore, parseInput, timeAgo } from './stores/transactions'

import SvgIcon          from './components/SvgIcon.vue'
import PeriodFilter     from './components/PeriodFilter.vue'
import TransactionItem  from './components/TransactionItem.vue'
import TransactionInput from './components/TransactionInput.vue'
import EditModal        from './components/EditModal.vue'
import SettingsModal    from './components/SettingsModal.vue'
import AnalyticsPane    from './components/AnalyticsPane.vue'
import AccountsModal   from './components/AccountsModal.vue'
import Toast            from './components/Toast.vue'

import {
  iconSun, iconMoon, iconSettings, iconLogout, iconCopy, iconCheck,
  iconHome, iconChart, iconIncome, iconExpense, iconTrash, iconWarn,
} from './icons'

// ── Stores ────────────────────────────────────────────────────────────────────

const auth        = useAuthStore()
const sourcesStore = useSourcesStore()
const settings = useSettingsStore()
const txStore  = useTransactionStore()
const { fmt }  = storeToRefs(settings)

// ── Theme ─────────────────────────────────────────────────────────────────────

const theme = ref(
  localStorage.getItem('theme') ??
  (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'),
)

watch(theme, (t) => {
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem('theme', t)
}, { immediate: true })

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

// ── Login ─────────────────────────────────────────────────────────────────────

const loginPanel   = ref('home')
const generatedId  = ref('')
const loginId      = ref('')
const loginError   = ref('')
const loginLoading = ref(false)
const idCopied     = ref(false)

/** Generate a new 4×4-digit ID and show the create panel. */
function initCreate() {
  const seg = () => String(Math.floor(1000 + Math.random() * 9000))
  generatedId.value = `${seg()}-${seg()}-${seg()}-${seg()}`
  loginError.value  = ''
  loginPanel.value  = 'create'
}

function copyGeneratedId() {
  navigator.clipboard.writeText(generatedId.value)
  idCopied.value = true
  setTimeout(() => { idCopied.value = false }, 2000)
}

async function doCreate() {
  loginLoading.value = true
  try {
    await auth.create(generatedId.value)
    await afterLogin()
  } catch (e) {
    loginError.value = e.message
  } finally {
    loginLoading.value = false
  }
}

async function doLogin() {
  const id = loginId.value.trim()
  if (!id) { loginError.value = 'Enter your Account ID'; return }

  loginLoading.value = true
  loginError.value   = ''

  try {
    await auth.login(id)
    await afterLogin()
  } catch {
    loginError.value = 'Account not found'
  } finally {
    loginLoading.value = false
  }
}

/** Runs once after a successful login or account creation. */
async function afterLogin() {
  await settings.load()
  // loadAll fetches all transactions for stats computation.
  // load(true) fetches the first page for the visible list.
  await Promise.all([txStore.loadAll(), txStore.load(true), sourcesStore.load()])
}

// ── App state ─────────────────────────────────────────────────────────────────

const activeTab      = ref('home')
const toastRef       = ref(null)
const showEdit       = ref(false)
const showSettings   = ref(false)
const showAccounts   = ref(false)
const editingId      = ref(null)
const deleteTarget   = ref(null)
const listLoading    = ref(false)
const accountIdCopied = ref(false)

const editingTx = computed(() =>
  txStore.txList.find(t => String(t.id) === String(editingId.value)) ?? null,
)

function showToast({ msg, type }) {
  toastRef.value?.show(msg, type)
}

function logout() {
  auth.logout()
}

function copyAccountId() {
  navigator.clipboard.writeText(auth.accountId)
  accountIdCopied.value = true
  setTimeout(() => { accountIdCopied.value = false }, 2000)
}

// ── Transactions ──────────────────────────────────────────────────────────────

async function handleAdd(raw) {
  let parsed
  try {
    parsed = parseInput(raw)
  } catch (e) {
    showToast({ msg: e.message, type: 'error' })
    return
  }

  try {
    const saved = await txStore.add(parsed)
    showToast({ msg: `Added ${saved.category}`, type: 'success' })
  } catch {
    showToast({ msg: 'Failed to save', type: 'error' })
  }
}

function openEdit(id) {
  editingId.value = id
  showEdit.value  = true
}

async function handleEditSave(updates) {
  try {
    await txStore.update(editingId.value, updates)
    showToast({ msg: 'Updated', type: 'success' })
  } catch {
    showToast({ msg: 'Update failed', type: 'error' })
  }
}

function requestDelete(id) {
  deleteTarget.value = txStore.txList.find(t => String(t.id) === String(id)) ?? null
}

async function executeDelete() {
  const id = deleteTarget.value?.id
  deleteTarget.value = null
  if (!id) return

  try {
    await txStore.remove(id)
    showToast({ msg: 'Deleted', type: 'success' })
  } catch {
    showToast({ msg: 'Delete failed', type: 'error' })
  }
}

function handlePeriodChange({ period, from, to }) {
  txStore.setPeriod(period, from, to)
}

/** Called by SettingsModal after a successful import. */
function onImportDone() {
  txStore.loadAll()
  txStore.load(true)
}

// ── iOS keyboard / visual viewport fix ───────────────────────────────────────
//
// On iOS Safari the visual viewport shrinks when the keyboard opens but
// position:fixed elements stay anchored to the layout viewport, hiding them
// under the keyboard. We read window.visualViewport.offsetTop and apply it
// as a CSS custom property so the input bar can translate itself up.

const inputBarOffset = ref(0)

function onViewportResize() {
  if (!window.visualViewport) return
  // offsetTop = gap between visual and layout viewport tops (keyboard height proxy)
  const keyboardH = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop
  inputBarOffset.value = Math.max(0, keyboardH)
}

onMounted(() => {
  window.visualViewport?.addEventListener('resize', onViewportResize)
  window.visualViewport?.addEventListener('scroll', onViewportResize)
})

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(async () => {
  if (auth.loggedIn) await afterLogin()
})

onUnmounted(() => {
  window.visualViewport?.removeEventListener('resize', onViewportResize)
  window.visualViewport?.removeEventListener('scroll', onViewportResize)
})
</script>

<style scoped>
.shell { min-height: 100vh; }

/* ── Login page ─────────────────────────────────────────────────────────────── */

.login-page {
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* Ambient gradient orbs */
.orb { position: fixed; border-radius: 50%; filter: blur(100px); pointer-events: none; }
.orb1 { width: 500px; height: 500px; background: var(--accent);  opacity: 0.06; top: -160px; right: -160px; }
.orb2 { width: 400px; height: 400px; background: var(--accent2); opacity: 0.06; bottom: -100px; left: -100px; }

.theme-toggle {
  position: fixed;
  top: 18px;
  right: 20px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text2);
  transition: border-color var(--transition), color var(--transition);
}
.theme-toggle:hover { border-color: var(--accent); color: var(--text); }

.login-wrap {
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 1;
}

.login-brand { text-align: center; margin-bottom: 20px; }
.login-logo {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--accent);
  color: var(--accent-text);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.6rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
}
.login-brand h1 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.login-brand p { font-size: 0.78rem; color: var(--text2); margin-top: 4px; }

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 28px;
  overflow: hidden;
}

.panel-stack { display: flex; flex-direction: column; gap: 10px; }

/* Shared button styles (login page) */
.btn-primary {
  width: 100%;
  padding: 12px;
  background: var(--accent);
  color: var(--accent-text);
  border: none;
  border-radius: var(--radius-sm);
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition), transform var(--transition);
  letter-spacing: 0.01em;
}
.btn-primary:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

.btn-ghost {
  width: 100%;
  padding: 11px;
  background: none;
  color: var(--text2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color var(--transition), color var(--transition);
}
.btn-ghost:hover { border-color: var(--border2); color: var(--text); }

.or-divider {
  text-align: center;
  position: relative;
  font-size: 0.72rem;
  color: var(--text2);
  margin: 2px 0;
}
.or-divider::before,
.or-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 44%;
  height: 1px;
  background: var(--border);
}
.or-divider::before { left: 0; }
.or-divider::after  { right: 0; }

/* Generated ID display */
.id-display {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px;
  text-align: center;
}
.id-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text2);
  margin-bottom: 8px;
}
.id-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--accent);
}
.id-copy {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
  padding: 5px 14px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text2);
  font-family: 'Inter', sans-serif;
  font-size: 0.72rem;
  cursor: pointer;
  transition: border-color var(--transition), color var(--transition);
}
.id-copy:hover { border-color: var(--accent); color: var(--accent); }

.warning-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.75rem;
  color: #fb923c;
  background: rgba(251,146,60,0.08);
  border: 1px solid rgba(251,146,60,0.25);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  line-height: 1.5;
}
.warn-icon { flex-shrink: 0; margin-top: 1px; }

.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-group label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text2);
}
.field-group input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 11px 13px;
  color: var(--text);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16px;
  outline: none;
  transition: border-color var(--transition);
  letter-spacing: 0.04em;
}
.field-group input:focus { border-color: var(--accent); }

.error-msg { font-size: 0.75rem; color: var(--danger); }

/* ── App shell ───────────────────────────────────────────────────────────────── */

.app-shell { display: flex; flex-direction: column; min-height: 100vh; }

/* Top bar */
.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 56px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: color-mix(in srgb, var(--bg) 85%, transparent);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  transition: background var(--transition);
}

.topbar-brand {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.2rem;
  letter-spacing: -0.01em;
  color: var(--accent);
}

.topbar-right { display: flex; align-items: center; gap: 6px; }

/* Account ID chip */
.id-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  font-size: 0.68rem;
  font-family: 'Space Grotesk', sans-serif;
  letter-spacing: 0.04em;
  color: var(--text2);
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color var(--transition), color var(--transition);
  white-space: nowrap;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.id-chip:hover { border-color: var(--border); color: var(--text); }

/* Desktop tab pills */
.desk-tabs { display: flex; gap: 2px; }
.desk-tab {
  padding: 6px 14px;
  border-radius: 7px;
  border: none;
  background: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text2);
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
}
.desk-tab:hover         { color: var(--text); background: var(--surface2); }
.desk-tab.active        { color: var(--text); background: var(--surface2); }

/* Icon button */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text2);
  transition: border-color var(--transition), color var(--transition);
}
.icon-btn:hover { border-color: var(--border2); color: var(--text); }

/* Sign out button (desktop) */
.topbar-logout {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: none;
  border-radius: 7px;
  background: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text2);
  cursor: pointer;
  transition: color var(--transition);
}
.topbar-logout:hover { color: var(--danger); }

/* ── Content area ────────────────────────────────────────────────────────────── */

.content {
  flex: 1;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  padding: 28px 20px 120px; /* bottom padding clears the fixed input bar */
}

.tab-pane { display: flex; flex-direction: column; gap: 20px; }

/* Stat cards */
.stats-row  { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat-card  {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 18px;
  transition: border-color var(--transition);
}
.stat-card:hover { border-color: var(--border2); }

.stat-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.stat-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text2); }
.stat-icon.expense { color: var(--danger); }
.stat-icon.income  { color: var(--success); }

.stat-amount {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.55rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.stat-amount.expense { color: var(--danger); }
.stat-amount.income  { color: var(--success); }

/* Transaction list */
.tx-list { display: flex; flex-direction: column; gap: 6px; }

.list-state {
  padding: 56px 0;
  text-align: center;
  color: var(--text2);
  font-size: 0.85rem;
}
.empty-icon { font-size: 2.2rem; margin-bottom: 8px; }

.spinner {
  width: 26px;
  height: 26px;
  margin: 0 auto;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.load-more-btn {
  width: 100%;
  padding: 11px;
  background: none;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  color: var(--text2);
  font-family: 'Inter', sans-serif;
  font-size: 0.78rem;
  cursor: pointer;
  transition: border-color var(--transition), color var(--transition);
  margin-top: 4px;
}
.load-more-btn:hover { border-color: var(--accent); color: var(--accent); }

/* Fixed input bar */
.input-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 90;
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: blur(16px);
  border-top: 1px solid var(--border);
  padding: 12px 20px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}
.input-inner {
  max-width: 680px;
  margin: 0 auto;
}

/* ── Mobile bottom nav ─────────────────────────────────────────────────────── */

.mobile-nav { display: none; }

/* ── Delete confirmation modal ─────────────────────────────────────────────── */

.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(6px);
}

.confirm-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 28px;
  width: 100%;
  max-width: 340px;
  text-align: center;
}

.confirm-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--danger-dim);
  color: var(--danger);
  margin: 0 auto 14px;
}

.confirm-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.confirm-body {
  font-size: 0.82rem;
  color: var(--text2);
  margin-bottom: 22px;
  line-height: 1.6;
}
.confirm-body strong { color: var(--text); }

.confirm-actions { display: flex; gap: 10px; }

.modal-btn {
  flex: 1;
  padding: 11px;
  border: none;
  border-radius: var(--radius-sm);
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition);
}
.modal-btn.secondary       { background: var(--surface2); color: var(--text2); }
.modal-btn.secondary:hover { color: var(--text); }
.modal-btn.danger          { background: var(--danger); color: #fff; }
.modal-btn.danger:hover    { opacity: 0.88; }

/* ── Transitions ───────────────────────────────────────────────────────────── */

.fade-enter-active, .fade-leave-active       { transition: opacity 0.15s ease; }
.fade-enter-from,   .fade-leave-to           { opacity: 0; }
.tab-fade-enter-active, .tab-fade-leave-active { transition: opacity 0.12s ease; }
.tab-fade-enter-from,   .tab-fade-leave-to     { opacity: 0; }

/* ── Responsive ────────────────────────────────────────────────────────────── */

@media (max-width: 640px) {
  /* Hide desktop-only elements */
  .desk-tabs,
  .topbar-logout { display: none; }

  .topbar { height: 50px; padding: 0 14px; }
  .topbar-brand { font-size: 1.05rem; }
  .id-chip { max-width: 120px; font-size: 0.62rem; }

  .content { padding: 16px 14px 160px; }

  /* Input bar sits above the bottom nav */
  .input-area {
    bottom: 56px;
    padding: 10px 14px;
    padding-bottom: 10px;
  }

  /* Show mobile nav */
  .mobile-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    height: 56px;
    background: color-mix(in srgb, var(--bg) 96%, transparent);
    backdrop-filter: blur(20px);
    border-top: 1px solid var(--border);
    padding-bottom: env(safe-area-inset-bottom);
  }

  .mobile-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text2);
    font-family: 'Inter', sans-serif;
    transition: color var(--transition);
    padding: 6px 4px;
  }
  .mobile-tab.active    { color: var(--accent); }
  .mobile-tab.logout-tab:hover { color: var(--danger); }

  .mobile-tab-label {
    font-size: 0.55rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
}
</style>
