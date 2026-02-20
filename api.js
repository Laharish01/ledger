// ============================================================
//  api.js — Ledger API client
//  Replaces the Supabase SDK. Reads API_URL from config.js.
// ============================================================

const TOKEN_KEY = 'ledger_token';
const ACCOUNT_KEY = 'ledger_account_id';

// ── Token helpers ─────────────────────────────────────────────

function getToken()  { return localStorage.getItem(TOKEN_KEY); }
function getAccountId() { return localStorage.getItem(ACCOUNT_KEY); }

function saveSession(accountId, token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ACCOUNT_KEY, accountId);
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ACCOUNT_KEY);
}

function isLoggedIn() { return !!getToken(); }

// ── Core fetch wrapper ────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(API_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    clearSession();
    window.location.replace('/ledger/login/');
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Auth ──────────────────────────────────────────────────────

const auth = {
  async create() {
    const data = await apiFetch('/api/account/create', { method: 'POST' });
    saveSession(data.accountId, data.token);
    return data;
  },

  async login(accountId) {
    const data = await apiFetch('/api/account/login', {
      method: 'POST',
      body: JSON.stringify({ accountId }),
    });
    saveSession(data.accountId, data.token);
    return data;
  },

  logout() {
    clearSession();
    window.location.replace('/ledger/login/');
  },

  getAccountId,
  isLoggedIn,
};

// ── Settings ──────────────────────────────────────────────────

const settings = {
  async get()           { return apiFetch('/api/settings'); },
  async update(payload) { return apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }); },
};

// ── Transactions ──────────────────────────────────────────────

const transactionsAPI = {
  async list(params = {}) {
    const q = new URLSearchParams();
    if (params.limit)  q.set('limit',  params.limit);
    if (params.offset) q.set('offset', params.offset);
    if (params.from)   q.set('from',   params.from);
    if (params.to)     q.set('to',     params.to);
    return apiFetch('/api/transactions?' + q.toString());
  },

  async stats() {
    return apiFetch('/api/transactions/stats');
  },

  async create(payload) {
    return apiFetch('/api/transactions', { method: 'POST', body: JSON.stringify(payload) });
  },

  async update(id, payload) {
    return apiFetch(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  async remove(id) {
    return apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
  },
};

// Export as global `api`
window.api = { auth, settings, transactions: transactionsAPI };
