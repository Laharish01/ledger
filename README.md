# Ledger — Personal Finance Tracker

Privacy-first finance tracker. No email, no password — just a generated account ID.

---

## Architecture

```
GitHub Pages (static frontend)
       ↕  fetch()
Cloudflare Worker (API + JWT auth)
       ↕  D1 SQL
Cloudflare D1 (SQLite database)
```

---

## Backend Setup (Cloudflare Worker)

### 1. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2. Create the D1 database

```bash
wrangler d1 create ledger
```

Copy the `database_id` from the output and paste it into `wrangler.toml`.

### 3. Run the schema

```bash
wrangler d1 execute ledger --file=schema.sql
```

### 4. Set the JWT secret

```bash
wrangler secret put JWT_SECRET
# Enter any long random string when prompted
```

### 5. Deploy the Worker

```bash
wrangler deploy
```

Your API will be live at `https://ledger-api.<your-subdomain>.workers.dev`

---

## Frontend Setup (GitHub Pages)

### 1. Add GitHub Secret

Repo → **Settings → Secrets → Actions → New secret**:

| Name | Value |
|------|-------|
| `API_URL` | `https://ledger-api.<your-subdomain>.workers.dev` |

### 2. Enable GitHub Pages

Repo → **Settings → Pages → Source → GitHub Actions**

Push to `main` or `master` to deploy.

---

## Local Development

Edit `config.js` with your real values (it's in `.gitignore`):

```js
const API_URL  = "https://ledger-api.<your-subdomain>.workers.dev";
const BASE_URL = "/";
(function(){const b=document.createElement("base");b.href=BASE_URL;document.head.prepend(b);})();
```

Serve from the repo root:
```bash
npx serve .
```

---

## Auth Flow

- User clicks **Create Account** → Worker generates `xxxx-xxxx-xxxx` ID, stores in D1, returns a signed JWT
- JWT is stored in `localStorage` and sent as `Authorization: Bearer <token>` on every request
- To log in from another device: enter the same account ID → Worker verifies it exists → returns new JWT
- Tokens expire after 90 days
