# Bayzara — Architecture & Deployment Overview

Built by **Keyd Solutions**

---

## Services at a Glance

| Layer | Service | URL |
|---|---|---|
| Frontend | Vercel (Next.js) | https://bayzara.vercel.app *(see Vercel dashboard for custom domain)* |
| Backend API | Cloudflare Workers (Hono.js) | https://bayzara-api.idbacfiidal.workers.dev |
| Database | Supabase (PostgreSQL) | https://xkbocpwzoqvqzthocgia.supabase.co |
| Auth | Supabase Auth (email + Google OAuth) | — |
| File Storage | Supabase Storage (business-logos bucket) | — |
| EVC Sync | Supabase Edge Function (`evc-sync`) | Runs on cron via Supabase |
| Source Code | GitHub | https://github.com/idbac25/Bayzara |

---

## Frontend — Vercel

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Deployed from:** `main` branch of the GitHub repo — every push auto-deploys
- **Region:** Washington D.C. (iad1)
- **Key env vars needed on Vercel:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_API_URL`
  - `HORMUD_API_BASE`, `HORMUD_SMS_USERNAME`, `HORMUD_SMS_PASSWORD`

---

## Backend API — Cloudflare Workers

- **Framework:** Hono.js
- **Repo:** separate repo (`bayzara-api`) — not this one
- **Live URL:** `https://bayzara-api.idbacfiidal.workers.dev`
- **Handles:** clients, vendors, invoices, quotations, payments CRUD
- **Auth:** validates Supabase JWT on every request (`Authorization: Bearer <token>`)

---

## Database — Supabase

- **Project URL:** `https://xkbocpwzoqvqzthocgia.supabase.co`
- **Dashboard:** https://supabase.com/dashboard/project/xkbocpwzoqvqzthocgia
- **Key tables:** `businesses`, `business_users`, `clients`, `vendors`, `documents`,
  `line_items`, `payment_records`, `inventory_items`, `evc_connections`,
  `evc_transactions`, `leads`, `pipelines`, `profiles`
- **Migrations:** `supabase/migrations/` in this repo (001–005)
  - Run manually in Supabase SQL Editor — **not auto-applied**
- **RLS:** enabled on all tables; service role key bypasses for admin operations
- **Edge Function:** `supabase/functions/evc-sync/` — polls Hormud EVC API on cron

---

## EVC Plus Integration — Hormud

- **Sync:** Supabase Edge Function polls Hormud every ~60s in the background
- **POS fast-poll:** Next.js `/api/evc/poll` called every 3s during POS payment wait
- **API base:** `https://merchant.hormuud.com/api`

---

## Local Development

```bash
git clone https://github.com/idbac25/Bayzara.git
cd Bayzara
npm install
cp .env.local.example .env.local   # fill in values
npm run dev
```

Open http://localhost:3000

---

## Deployment Flow

```
Developer pushes to main
        │
        ▼
  GitHub (idbac25/Bayzara)
        │
        ▼
  Vercel auto-builds & deploys frontend
        │
        ▼ (manual, when schema changes)
  Supabase SQL Editor — run migration file
```

The **Cloudflare Worker backend** is deployed separately from its own repo using `wrangler deploy`.

---

*Last updated: March 2026*
