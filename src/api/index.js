// ── Request cache ─────────────────────────────────────────────────────────────
//
// Maps a request ID (the full URL) → resolved response data.
// Only successful GET responses are cached.
// Any mutating request (POST/PUT/DELETE) clears the entire cache
// so subsequent GETs always return fresh data.
//
// Storing the resolved value (not the promise) means:
//   - Errors are never cached — a failed request can be retried.
//   - Returning cached data is a plain synchronous map lookup.
//   - The network is only hit once per unique URL per session.

const responseCache = new Map()   // url → resolved data

function cacheRead(url)         { return responseCache.get(url) ?? null }
function cacheWrite(url, data)  { responseCache.set(url, data) }
function cacheInvalidate()      { responseCache.clear() }

// ── In-flight deduplication ───────────────────────────────────────────────────
//
// If two callers request the same URL before the first resolves,
// we share one in-flight fetch instead of firing two requests.
// Once resolved, the result is moved into responseCache and removed here.

const inFlight = new Map()   // url → Promise<data>

// ── Token helpers ─────────────────────────────────────────────────────────────

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
  cacheInvalidate()
  inFlight.clear()
}

// ── Core fetch ────────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token  = getToken()
  const apiUrl = import.meta.env.VITE_API_URL
  const apiKey = import.meta.env.VITE_API_KEY
  const method = (options.method ?? 'GET').toUpperCase()
  const url    = apiUrl + path   // full URL is the unique request ID

  const init = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  }

  // ── GET: check cache first, then deduplicate in-flight ────────────────────
  if (method === 'GET') {

    // 1. Cache hit — return stored data immediately, no network call
    const cached = cacheRead(url)
    if (cached !== null) return cached

    // 2. In-flight hit — another caller already fired this request; join it
    const existing = inFlight.get(url)
    if (existing) return existing

    // 3. Cache miss — fire the request, register it as in-flight
    const request = fetch(url, init).then(async (res) => {
      if (res.status === 401) { clearSession(); window.location.reload(); return null }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')

      // Move from in-flight to persistent cache on success
      cacheWrite(url, data)
      inFlight.delete(url)
      return data

    }).catch((err) => {
      // Remove from in-flight on error so the next call retries
      inFlight.delete(url)
      throw err
    })

    inFlight.set(url, request)
    return request
  }

  // ── Mutating request: invalidate cache, then fetch ────────────────────────
  cacheInvalidate()
  inFlight.clear()

  const res  = await fetch(url, init)
  if (res.status === 401) { clearSession(); window.location.reload(); return null }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Request failed')
  return data
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const auth = {
  async create(accountId) {
    const data = await apiFetch('/api/account/create', {
      method: 'POST',
      body:   JSON.stringify({ accountId }),
    })
    saveSession(data.accountId, data.token)
    return data
  },

  async login(accountId) {
    const data = await apiFetch('/api/account/login', {
      method: 'POST',
      body:   JSON.stringify({ accountId }),
    })
    saveSession(data.accountId, data.token)
    return data
  },
}

// ── Settings ──────────────────────────────────────────────────────────────────

export const settings = {
  get()           { return apiFetch('/api/settings') },
  update(payload) { return apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }) },
}

// ── Transactions ──────────────────────────────────────────────────────────────

export const transactions = {
  list(params = {}) {
    const q = new URLSearchParams()
    if (params.limit)  q.set('limit',  params.limit)
    if (params.offset) q.set('offset', params.offset)
    if (params.from)   q.set('from',   params.from)
    if (params.to)     q.set('to',     params.to)
    return apiFetch('/api/transactions?' + q.toString())
  },

  stats()             { return apiFetch('/api/transactions/stats') },
  create(payload)     { return apiFetch('/api/transactions',       { method: 'POST',   body: JSON.stringify(payload) }) },
  update(id, payload) { return apiFetch(`/api/transactions/${id}`, { method: 'PUT',    body: JSON.stringify(payload) }) },
  remove(id)          { return apiFetch(`/api/transactions/${id}`, { method: 'DELETE' }) },
}

// ── Payment sources ───────────────────────────────────────────────────────────

export const sources = {
  list()             { return apiFetch('/api/sources') },
  create(payload)    { return apiFetch('/api/sources',       { method: 'POST',   body: JSON.stringify(payload) }) },
  update(id, payload){ return apiFetch(`/api/sources/${id}`, { method: 'PUT',    body: JSON.stringify(payload) }) },
  remove(id)         { return apiFetch(`/api/sources/${id}`, { method: 'DELETE' }) },
}
