// ── Token helpers ─────────────────────────────────────────────
const TOKEN_KEY   = 'ledger_token'
const ACCOUNT_KEY = 'ledger_account_id'

export function getToken()     { return localStorage.getItem(TOKEN_KEY) }
export function getAccountId() { return localStorage.getItem(ACCOUNT_KEY) }
export function isLoggedIn()   { return !!getToken() }

export function saveSession(accountId, token) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ACCOUNT_KEY, accountId)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ACCOUNT_KEY)
}

// ── Core fetch ────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token  = getToken()
  const apiUrl = import.meta.env.VITE_API_URL
  const apiKey = import.meta.env.VITE_API_KEY

  const res = await fetch(apiUrl + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  if (res.status === 401) {
    clearSession()
    window.location.href = '/ledger/login'
    return
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// ── Auth ──────────────────────────────────────────────────────
export const auth = {
  async create(accountId) {
    const data = await apiFetch('/api/account/create', {
      method: 'POST',
      body: JSON.stringify({ accountId }),
    })
    saveSession(data.accountId, data.token)
    return data
  },

  async login(accountId) {
    const data = await apiFetch('/api/account/login', {
      method: 'POST',
      body: JSON.stringify({ accountId }),
    })
    saveSession(data.accountId, data.token)
    return data
  },

  logout() {
    clearSession()
  },
}

// ── Settings ──────────────────────────────────────────────────
export const settings = {
  get()           { return apiFetch('/api/settings') },
  update(payload) { return apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }) },
}

// ── Transactions ──────────────────────────────────────────────
export const transactions = {
  list(params = {}) {
    const q = new URLSearchParams()
    if (params.limit)  q.set('limit',  params.limit)
    if (params.offset) q.set('offset', params.offset)
    if (params.from)   q.set('from',   params.from)
    if (params.to)     q.set('to',     params.to)
    return apiFetch('/api/transactions?' + q.toString())
  },

  stats()           { return apiFetch('/api/transactions/stats') },
  create(payload)   { return apiFetch('/api/transactions', { method: 'POST', body: JSON.stringify(payload) }) },
  update(id, payload) { return apiFetch(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }) },
  remove(id)        { return apiFetch(`/api/transactions/${id}`, { method: 'DELETE' }) },
}
