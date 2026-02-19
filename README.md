# 💰 Simple Ledger — Finance Tracker - With Charts!

Fully static finance tracker. No backend server.
GitHub Pages for hosting · Supabase for auth and database.

---

## Setup

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com) → New Project.

### 2. Run the schema
Supabase dashboard → **SQL Editor** → paste and run `schema.sql`.

### 3. Get your credentials
Supabase dashboard → **Settings → API**, copy:
- **Project URL** — looks like `https://xxxx.supabase.co`
- **anon / public key**

### 4. Add secrets to GitHub
GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret name         | Value                               |
|---------------------|-------------------------------------|
| `SUPABASE_URL`      | `https://your-project.supabase.co`  |
| `SUPABASE_ANON_KEY` | `your-anon-public-key`              |

### 5. Enable GitHub Pages via Actions
GitHub repo → **Settings → Pages → Source → GitHub Actions**

### 6. Push to main
The workflow in `.github/workflows/deploy.yml` runs automatically,
injects your secrets into `config.js` at build time, and deploys.
Your keys are **never stored in the repository**.

---

## Local Development

Temporarily fill in real values in `config.js` for local testing:

```js
const SUPABASE_URL  = "https://your-project.supabase.co";
const SUPABASE_ANON = "your-anon-public-key";
```

Uncomment `config.js` in `.gitignore` while doing this so you
never accidentally commit the real keys.

---

## Transaction Format

| Input | Result |
|-------|--------|
| `50 Food Lunch at cafe` | $50 expense, Food |
| `120 Transport Monthly bus pass` | $120 expense, Transport |
| `-3000 Salary Paycheck` | $3,000 income, Salary |

Negative amounts are recorded as income.

---

## Security

| Concern | Solution |
|---------|----------|
| Password hashing | Argon2id via Supabase Auth |
| API keys in repo | Injected at deploy time via GitHub Secrets |
| Cross-user data access | Row Level Security at DB level |
| Anon key exposure | Safe by design — useless without a valid user session |

---

## File structure

```
├── .github/workflows/deploy.yml  ← Injects secrets & deploys
├── index.html                    ← Login / Register
├── app.html                      ← Dashboard
├── analytics.html                ← Charts
├── config.js                     ← Placeholder only
├── schema.sql                    ← Run once in Supabase
└── .gitignore
```
