// ============================================================
//  config.js — injected at deploy time by GitHub Actions
//
//  Secrets to add in GitHub → Settings → Secrets:
//    API_URL  → https://ledger-api.your-subdomain.workers.dev
//    API_KEY  → same random string set via: wrangler secret put API_KEY
//
//  For local dev, fill in real values below (never commit them)
// ============================================================
const API_URL  = "INJECTED_AT_BUILD";
const API_KEY  = "INJECTED_AT_BUILD";
const BASE_URL = "INJECTED_AT_BUILD";

// Set <base> so relative paths work from any subfolder
(function () {
  const base = document.createElement('base');
  base.href = (typeof BASE_URL !== 'undefined' && BASE_URL !== 'INJECTED_AT_BUILD')
    ? BASE_URL : '/';
  document.head.prepend(base);
})();
