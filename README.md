# Carrier Management

A lightweight carrier management web app for trucking / auto-transport dispatch operations.
Track carrier details, contacts, lanes, historical loads, and notes — all from one place.

Designed to be embedded later into a larger Dispatch Command Center, so the API
is kept clean, REST-y, and JSON-only from day one.

## Stack

| Layer     | Tech |
|-----------|------|
| Backend   | Node.js + Express |
| Database  | SQLite via `better-sqlite3` |
| Frontend  | Vanilla JS, single HTML file served by Express |
| Deployment| Railway (`railway.json`) |

## Project structure

```
.
├── server.js              # Express entry point
├── db.js                  # SQLite connection + schema init
├── routes/
│   ├── carriers.js
│   ├── contacts.js
│   ├── lanes.js
│   ├── loads.js
│   └── notes.js
├── public/
│   └── index.html         # Single-file SPA (list + detail views)
├── data/                  # SQLite db location (gitignored)
├── railway.json
├── .env.example
└── package.json
```

## Running locally

```bash
npm install
cp .env.example .env
npm start
```

Then visit http://localhost:3000

The SQLite database is created automatically at `./data/carriers.db` on first boot.

## Environment

| Var       | Default                  | Description |
|-----------|--------------------------|-------------|
| `PORT`    | `3000`                   | Port Express listens on (Railway overrides) |
| `DB_PATH` | `./data/carriers.db`     | SQLite db file path. In production, point this at a mounted volume. |

## API

All endpoints return JSON.

### Carriers
| Method | Path | Notes |
|--------|------|-------|
| `GET`    | `/api/carriers`          | List. Query params: `q` (search name/MC#/contact name), `status`, `equipment`. Includes `lane_count`, `load_count`, `contact_count`. |
| `POST`   | `/api/carriers`          | Create |
| `GET`    | `/api/carriers/:id`      | Detail (includes nested `contacts`, `lanes`, `loads`, `notes`) |
| `PUT`    | `/api/carriers/:id`      | Update |
| `DELETE` | `/api/carriers/:id`      | Delete (cascades to all child records) |

### Contacts
| Method | Path | Notes |
|--------|------|-------|
| `GET`    | `/api/carriers/:id/contacts` | List |
| `POST`   | `/api/carriers/:id/contacts` | Create |
| `PUT`    | `/api/contacts/:id`          | Update |
| `DELETE` | `/api/contacts/:id`          | Delete |

### Lanes
| Method | Path |
|--------|------|
| `GET`    | `/api/carriers/:id/lanes` |
| `POST`   | `/api/carriers/:id/lanes` |
| `DELETE` | `/api/lanes/:id` |

### Loads
| Method | Path |
|--------|------|
| `GET`    | `/api/carriers/:id/loads` |
| `POST`   | `/api/carriers/:id/loads` |
| `PUT`    | `/api/loads/:id` |
| `DELETE` | `/api/loads/:id` |

### Notes
| Method | Path |
|--------|------|
| `GET`    | `/api/carriers/:id/notes` |
| `POST`   | `/api/carriers/:id/notes` |
| `DELETE` | `/api/notes/:id` |

### Other
| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | Health probe — returns `{status:"ok", ...}` |

## Data model

- **carriers** — `id, name, mc_number, dot_number, equipment_type (Enclosed/Open/Flatbed/Hotshot/Other), price_per_mile, status (Active/Watch/Blocked), insurance_expiry, created_at, updated_at`
- **contacts** — `id, carrier_id, name, role, phone, email`
- **lanes** — `id, carrier_id, origin, destination`
- **loads** — `id, carrier_id, load_number, date, origin, destination, outcome (Completed/TONU/Issue), notes`
- **carrier_notes** — `id, carrier_id, note, created_at`

All child tables have `ON DELETE CASCADE` foreign keys back to `carriers`.

## Deploying to Railway

1. Push the repo to GitHub.
2. On [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**.
3. Add a **Volume** mounted at `/data` for persistent SQLite storage.
4. Set env vars:
   - `DB_PATH=/data/carriers.db`
   - (Railway sets `PORT` automatically.)
5. Deploy. The `railway.json` config uses `/health` as the healthcheck.

## Frontend notes

The single-file SPA lives at `public/index.html`. It uses hash-based routing:

- `#/` — carrier list with search & filters
- `#/carrier/:id` — detail view (info, contacts, lanes, loads, notes)

It respects `prefers-color-scheme` and is dark-by-default, desktop-first but usable on mobile.
