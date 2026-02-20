<template>
  <div class="page">
    <div class="grid-bg"></div>
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>

    <button class="theme-btn icon-btn" @click="toggleTheme">{{ isDark ? '☀' : '☾' }}</button>

    <div class="auth-container">
      <div class="brand">
        <h1>Ledger</h1>
        <p>Personal Finance Tracker</p>
      </div>

      <div class="card">
        <div v-if="msg" class="msg" :class="msgType">{{ msg }}</div>

        <!-- Home -->
        <div v-if="panel === 'home'">
          <button class="btn" @click="showCreate">Create New Account</button>
          <div class="divider">or</div>
          <button class="btn secondary" @click="panel = 'login'">Sign In with Account ID</button>
        </div>

        <!-- Create -->
        <div v-if="panel === 'create'">
          <div class="account-id-box">
            <div class="account-id-label">Your Account ID</div>
            <div class="account-id-value">{{ generatedId }}</div>
            <button class="copy-btn" @click="copyId">{{ copied ? 'Copied!' : 'Copy ID' }}</button>
          </div>
          <div class="warning-box">
            <strong>⚠ Save this ID somewhere safe.</strong>
            This is the only way to access your account. It cannot be recovered if lost.
          </div>
          <button class="btn" :disabled="loading" @click="createAccount">
            {{ loading ? 'Creating…' : 'Create Account & Sign In' }}
          </button>
          <button class="btn secondary" @click="panel = 'home'" style="margin-top:8px">Back</button>
        </div>

        <!-- Login -->
        <div v-if="panel === 'login'">
          <div class="form-group">
            <label>Account ID</label>
            <input
              v-model="loginId"
              type="text"
              placeholder="xxxx-xxxx-xxxx-xxxx"
              autocomplete="off"
              spellcheck="false"
              @keydown.enter="login"
            >
          </div>
          <button class="btn" :disabled="loading" @click="login">
            {{ loading ? 'Signing in…' : 'Sign In' }}
          </button>
          <button class="btn secondary" @click="panel = 'home'" style="margin-top:8px">Back</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth   = useAuthStore()

const panel       = ref('home')
const loading     = ref(false)
const msg         = ref('')
const msgType     = ref('error')
const generatedId = ref('')
const loginId     = ref('')
const copied      = ref(false)
const isDark      = ref(document.documentElement.getAttribute('data-theme') !== 'light')

function showMsg(text, type = 'error') { msg.value = text; msgType.value = type }

function showCreate() {
  const seg = () => String(Math.floor(1000 + Math.random() * 9000))
  generatedId.value = `${seg()}-${seg()}-${seg()}-${seg()}`
  panel.value = 'create'
  msg.value   = ''
}

function copyId() {
  navigator.clipboard.writeText(generatedId.value).then(() => {
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  })
}

function toggleTheme() {
  const next = isDark.value ? 'light' : 'dark'
  isDark.value = !isDark.value
  window.__ledgerTheme?.set(next)
}

async function createAccount() {
  loading.value = true
  try {
    await auth.create(generatedId.value)
    router.push('/app')
  } catch (e) {
    showMsg(e.message || 'Failed to create account')
  } finally {
    loading.value = false
  }
}

async function login() {
  const id = loginId.value.trim()
  if (!id) return showMsg('Please enter your Account ID')
  loading.value = true
  try {
    await auth.login(id)
    router.push('/app')
  } catch {
    showMsg('Account ID not found or invalid')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center; overflow-x: hidden;
  background: var(--bg); transition: background 0.3s;
}

.orb { position: fixed; width: 600px; height: 600px; border-radius: 50%; filter: blur(120px); pointer-events: none; opacity: 0.15; }
.orb-1 { background: var(--accent); top: -200px; right: -200px; }
.orb-2 { background: var(--accent2); bottom: -200px; left: -200px; }
[data-theme="light"] .orb { opacity: 0.08; }

.theme-btn { position: fixed; top: 16px; right: 20px; z-index: 200; }
.icon-btn {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; width: 36px; height: 36px; font-size: 1rem;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; color: var(--text);
}
.icon-btn:hover { border-color: var(--accent); }

.auth-container { position: relative; z-index: 1; width: 100%; max-width: 440px; padding: 20px; }

.brand { text-align: center; margin-bottom: 40px; }
.brand h1 { font-family: 'Roboto Slab', serif; font-size: 3rem; color: var(--accent); letter-spacing: -1px; }
.brand p  { color: var(--muted); font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; margin-top: 6px; }

.card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 32px; }

.msg { padding: 10px 14px; border-radius: 8px; font-size: 0.8rem; margin-bottom: 16px; }
.msg.error   { background: rgba(255,95,109,0.1); border: 1px solid rgba(255,95,109,0.3); color: var(--danger); }
.msg.success { background: rgba(74,222,128,0.1);  border: 1px solid rgba(74,222,128,0.3); color: var(--success); }

.account-id-box {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 10px; padding: 16px; margin-bottom: 20px; text-align: center;
}
.account-id-label { font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.account-id-value { font-family: 'Roboto', monospace; font-size: 1.05rem; font-weight: 500; color: var(--accent); letter-spacing: 0.04em; }
.copy-btn {
  margin-top: 10px; padding: 6px 14px; background: none;
  border: 1px solid var(--border); border-radius: 6px;
  color: var(--muted); font-family: 'Roboto', sans-serif; font-size: 0.72rem;
  cursor: pointer; transition: all 0.2s; letter-spacing: 0.05em; text-transform: uppercase;
}
.copy-btn:hover { border-color: var(--accent); color: var(--accent); }

.warning-box {
  background: rgba(251,146,60,0.08); border: 1px solid rgba(251,146,60,0.3);
  border-radius: 8px; padding: 12px 14px; margin-bottom: 20px;
  font-size: 0.78rem; color: #fb923c; line-height: 1.5;
}
.warning-box strong { display: block; margin-bottom: 2px; }

.form-group { margin-bottom: 16px; }
label { display: block; font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
input {
  width: 100%; background: var(--bg); border: 1px solid var(--border);
  border-radius: 8px; padding: 12px 14px; color: var(--text);
  font-family: 'Roboto', monospace; font-size: 16px;
  outline: none; transition: border-color 0.2s;
}
input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(200,245,96,0.08); }

.btn {
  width: 100%; padding: 13px; background: var(--accent); color: var(--accent-text);
  border: none; border-radius: 8px; font-family: 'Roboto', sans-serif;
  font-size: 0.85rem; font-weight: 500; letter-spacing: 0.05em;
  cursor: pointer; margin-top: 8px; transition: all 0.2s; text-transform: uppercase;
}
.btn:hover    { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(200,245,96,0.2); }
.btn:active   { transform: translateY(0); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn.secondary {
  background: none; border: 1px solid var(--border); color: var(--muted); box-shadow: none;
}
.btn.secondary:hover { border-color: var(--accent); color: var(--accent); transform: none; box-shadow: none; }

.divider { text-align: center; color: var(--muted); font-size: 0.75rem; margin: 20px 0; position: relative; }
.divider::before, .divider::after { content: ''; position: absolute; top: 50%; width: 42%; height: 1px; background: var(--border); }
.divider::before { left: 0; } .divider::after { right: 0; }

@media (max-width: 480px) { .card { padding: 24px 20px; } .brand h1 { font-size: 2.5rem; } }
</style>
