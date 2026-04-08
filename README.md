# Zodiak Capacity Tracker

A full-stack web app for collecting carrier capacity submissions and reviewing them on a private dashboard.

- **Public form** — carriers submit their available trucks, location, and availability.
- **Private dashboard** — password-protected view of all submissions with status management (new → contacted → archived).

---

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Backend   | Node.js + Express |
| Database  | SQLite (via `better-sqlite3`) |
| Frontend  | React 18 + Vite + Tailwind CSS |
| Auth      | JWT (`jsonwebtoken`) + bcrypt |
| Email     | Nodemailer (SMTP) |

---

## Local Development

### 1. Prerequisites

- Node.js 18+
- npm 9+

### 2. Clone & install

```bash
git clone <repo-url>
cd zodiak-capacity-tracker

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Any long random string |
| `DASHBOARD_PASSWORD_HASH` | Bcrypt hash of your chosen password (see below) |
| `SMTP_HOST` | Your SMTP server host |
| `SMTP_PORT` | Usually `587` (TLS) or `465` (SSL) |
| `SMTP_SECURE` | `true` for port 465, `false` for 587 |
| `SMTP_USER` | SMTP username / email address |
| `SMTP_PASS` | SMTP password or App Password |
| `SMTP_FROM` | "From" display name and email |

### 4. Generate your dashboard password hash

```bash
npm run hash -- yourpassword
```

Copy the output line into your `.env` file:

```
DASHBOARD_PASSWORD_HASH=$2b$10$...
```

### 5. Start in development mode

```bash
npm run dev
```

This starts:
- Backend API on `http://localhost:3001`
- Frontend dev server on `http://localhost:5173` (proxies `/api` to the backend)

Open `http://localhost:5173` to see the submission form.  
Open `http://localhost:5173/dashboard` to access the dashboard (login required).

---

## Email Setup

### Gmail (recommended)

1. Enable 2-Step Verification on your Google account.
2. Go to **Google Account → Security → App Passwords**.
3. Create an App Password for "Mail".
4. Use those settings in `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx   # 16-char App Password
SMTP_FROM=Zodiak Capacity Tracker <you@gmail.com>
```

> If SMTP is not configured, submissions still save to the database — the email notification is simply skipped.

---

## Production Build (local preview)

```bash
npm run build          # builds client/dist
NODE_ENV=production node server/index.js
```

The Express server will serve the built frontend at `http://localhost:3001`.

---

## Deploy to Railway

1. Push the repo to GitHub.
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**.
3. Select your repository.
4. Railway auto-detects Node.js. Set these under **Variables**:
   - All variables from `.env.example` with real values
   - `NODE_ENV=production`
5. Set the **Build Command**:
   ```
   npm run build
   ```
6. Set the **Start Command**:
   ```
   npm start
   ```
7. For persistent SQLite storage, add a **Volume** mounted at `/app/data`.

---

## Deploy to Render

1. Push the repo to GitHub.
2. Go to [render.com](https://render.com) → **New → Web Service**.
3. Connect your GitHub repo and configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Node
4. Add all environment variables from `.env.example` under **Environment Variables**.
5. For persistent SQLite, go to **Disks** and add a disk mounted at `/app/data`.

---

## Project Structure

```
zodiak-capacity-tracker/
├── server/
│   ├── index.js              # Express app entry point
│   ├── db.js                 # SQLite connection + schema
│   ├── middleware/
│   │   └── auth.js           # JWT verification middleware
│   └── routes/
│       ├── auth.js           # POST /api/auth/login
│       └── submissions.js    # CRUD for capacity submissions
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── SubmitPage.jsx    # Public submission form
│   │   │   ├── LoginPage.jsx     # Dashboard login
│   │   │   └── DashboardPage.jsx # Private capacity board
│   │   ├── components/
│   │   │   ├── CapacityCard.jsx  # Individual submission card
│   │   │   └── ProtectedRoute.jsx
│   │   └── utils/
│   │       ├── api.js        # Fetch wrapper
│   │       └── auth.js       # Token helpers
│   └── vite.config.js
├── scripts/
│   └── generate-hash.js      # Password hash utility
├── data/                     # SQLite database (gitignored)
├── .env.example
└── package.json
```

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | No | Get JWT token |
| `POST` | `/api/submissions` | No | Submit new capacity |
| `GET` | `/api/submissions` | Yes | List all (filter: `?status=new`, sort: `?sort=location`) |
| `PATCH` | `/api/submissions/:id/status` | Yes | Update status (`new`/`contacted`/`archived`) |
| `DELETE` | `/api/submissions/:id` | Yes | Permanently delete a submission |
