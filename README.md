<p align="center">
  <img src="https://i.imgur.com/tuBAEOR.png" alt="Zempel Auto — PartsCommand API" width="320" />
</p>

<h1 align="center">PartsCommand API</h1>

<p align="center">
  <strong>Cloudflare Worker backend powering the PartsCommand CRM — inventory sync, data persistence, and live competitor pricing.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/runtime-Cloudflare_Workers-f59e0b?style=for-the-badge&labelColor=0f172a" alt="Runtime" />
  <img src="https://img.shields.io/badge/database-Neon_Postgres-3b82f6?style=for-the-badge&labelColor=0f172a" alt="Database" />
  <img src="https://img.shields.io/badge/ORM-Drizzle-10b981?style=for-the-badge&labelColor=0f172a" alt="ORM" />
  <img src="https://img.shields.io/badge/language-TypeScript-0ea5e9?style=for-the-badge&labelColor=0f172a" alt="Language" />
</p>

---

## ✨ Overview

**PartsCommand API** is a lightweight, edge-deployed REST API built on **Cloudflare Workers**. It serves as the backend for the [PartsCommand CRM](https://github.com/TechGuruServices/parts-command-crm) front-end, providing:

- Full database sync (read/write) against **Neon Serverless PostgreSQL**
- Type-safe schema via **Drizzle ORM**
- CORS-enabled endpoints for cross-origin PWA access
- Live competitor price scraping from major auto parts retailers

> **Production URL:** `https://parts-command-api.techguruofficial.workers.dev`

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/sync` | Returns full database state (inventory, customers, vehicles, sales) |
| `POST` | `/sync` | Receives full client state and persists to Neon Postgres |
| `GET` | `/prices?partNumber=...&brand=...` | Fetches live competitor prices from NAPA, AutoZone, Advance Auto |
| `OPTIONS` | `*` | CORS preflight handler |

### Example — Fetch Inventory

```bash
curl https://parts-command-api.techguruofficial.workers.dev/sync
```

### Example — Price Lookup

```bash
curl "https://parts-command-api.techguruofficial.workers.dev/prices?partNumber=15208-65F0E&brand=Nissan"
```

---

## 🏗️ Architecture

```
┌──────────────────────────┐
│    PartsCommand CRM      │
│    (PWA Frontend)        │
└───────────┬──────────────┘
            │ HTTPS
            ▼
┌──────────────────────────┐
│   Cloudflare Worker      │
│   parts-command-api      │
│                          │
│   src/index.ts           │
│   ├── GET  /sync         │
│   ├── POST /sync         │
│   └── GET  /prices       │
│                          │
│   src/schema.ts          │
│   └── Drizzle ORM tables │
└───────────┬──────────────┘
            │ Neon Serverless Driver
            ▼
┌──────────────────────────┐
│   Neon PostgreSQL        │
│                          │
│   Tables:                │
│   ├── inventory          │
│   ├── customers          │
│   ├── vehicles           │
│   └── sales              │
└──────────────────────────┘
```

---

## 📦 Database Schema

Defined in `src/schema.ts` using Drizzle ORM:

| Table | Key Columns |
|:------|:------------|
| **inventory** | `id`, `name`, `partNumber`, `barcode`, `category`, `supplier`, `brand`, `location`, `cost`, `price`, `stock`, `minStock` |
| **customers** | `id`, `name`, `phone`, `email` |
| **vehicles** | `id`, `make`, `model`, `year`, `vin`, `customerId` (FK → customers) |
| **sales** | `id`, `customerId` (FK → customers), `status`, `total`, `margin`, `date` |

---

## 🛠️ Tech Stack

| Component | Technology |
|:----------|:-----------|
| **Runtime** | Cloudflare Workers (V8 isolates) |
| **Language** | TypeScript |
| **Database** | Neon Serverless PostgreSQL |
| **ORM** | Drizzle ORM (`drizzle-orm` + `drizzle-kit`) |
| **DB Driver** | `@neondatabase/serverless` |
| **Testing** | Vitest + `@cloudflare/vitest-pool-workers` |
| **Config** | Wrangler (JSONC) |

---

## ⚡ Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm i -g wrangler`)
- A [Neon](https://neon.tech/) PostgreSQL database

### Install

```bash
git clone https://github.com/TechGuruServices/parts-command-api.git
cd parts-command-api
npm install
```

### Configure Secrets

Create a `.dev.vars` file for local development:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
```

For production, set the secret via Wrangler:

```bash
npx wrangler secret put DATABASE_URL
```

### Run Locally

```bash
npm run dev
```

The API will be available at `http://localhost:8787`.

### Deploy

```bash
npm run deploy
```

### Run Tests

```bash
npm test
```

---

## 📂 Project Structure

```
parts-command-api/
├── src/
│   ├── index.ts              # Worker entry — route handler
│   └── schema.ts             # Drizzle ORM table definitions
├── test/
│   ├── index.spec.ts         # API test suite
│   ├── env.d.ts              # Test environment types
│   └── tsconfig.json         # Test TS config
├── public/
│   └── index.html            # Default landing page at /
├── package.json              # Dependencies & scripts
├── package-lock.json         # Lockfile
├── tsconfig.json             # TypeScript configuration
├── wrangler.jsonc            # Cloudflare Worker config
├── drizzle.config.ts         # Drizzle Kit migration config
├── vitest.config.mts         # Vitest configuration
├── worker-configuration.d.ts # Cloudflare type definitions
├── .editorconfig             # Editor formatting rules
├── .prettierrc               # Prettier config
└── .gitignore
```

---

## 🔒 Security

- **`DATABASE_URL` is a secret** — never committed to the repo
- **CORS headers** allow cross-origin access from the CRM PWA
- **Cloudflare edge** — requests never hit a traditional server
- **Neon serverless driver** — connection pooling handled automatically

---

## 📄 License

**Proprietary** — © 2026 Zempel Auto. All rights reserved.

---

<p align="center">
  <img src="https://i.imgur.com/tuBAEOR.png" alt="Zempel Auto" width="100" />
  <br />
  <sub>Backend for PartsCommand CRM · Built on Cloudflare Workers</sub>
</p>
