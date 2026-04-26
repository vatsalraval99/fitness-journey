# Journi — AI Fitness & Habit Journey Tracker

A personalised fitness tracker with AI-powered meal logging, adaptive weekly milestones, and habit coaching.

Built with React + Vite (frontend) and Express (backend API proxy).

---

## Project Structure

```
journi/
├── frontend/          → React app (deploy to Vercel)
│   ├── src/
│   │   ├── pages/     → Today, Journey, Meals, Habits, Checkin, Setup
│   │   ├── components/→ Reusable UI + styles
│   │   ├── context/   → Global state (JourneyContext)
│   │   └── utils/     → Fitness calculations, API helper
│   └── vite.config.js
├── backend/           → Express API proxy (deploy to Vercel separately)
│   └── index.js
└── README.md
```

---

## Local Development

### 1. Clone and install

```bash
# Backend
cd backend
npm install
cp .env.example .env
# → Add your ANTHROPIC_API_KEY to .env

# Frontend
cd ../frontend
npm install
cp .env.example .env.local
# → Leave VITE_API_URL blank for local dev (Vite proxy handles /api)
```

### 2. Run both servers

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open http://localhost:5173

---

## Deploy to GitHub + Vercel

### Step 1 — Push to GitHub

```bash
# In the journi/ root folder
git init
git add .
git commit -m "Initial Journi build"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/journi.git
git push -u origin main
```

### Step 2 — Deploy the backend

1. Go to https://vercel.com → New Project
2. Import your `journi` repo
3. Set **Root Directory** to `backend`
4. Add Environment Variables:
   - `ANTHROPIC_API_KEY` → your key from console.anthropic.com
   - `ALLOWED_ORIGINS` → `https://your-journi-frontend.vercel.app` (fill in after frontend is deployed)
5. Deploy → copy the backend URL (e.g. `https://journi-backend.vercel.app`)

### Step 3 — Deploy the frontend

1. Go to Vercel → New Project → same repo
2. Set **Root Directory** to `frontend`
3. Add Environment Variables:
   - `VITE_API_URL` → paste your backend URL from Step 2
4. Deploy → your app is live!

### Step 4 — Update CORS

Go back to your backend Vercel project → Settings → Environment Variables → update `ALLOWED_ORIGINS` to include your frontend URL → Redeploy.

---

## Get an Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign up / log in
3. Click **API Keys** → Create key
4. Copy it into your backend `.env` as `ANTHROPIC_API_KEY`

New accounts get free credits — enough for a portfolio demo.

---

## Features

- **Journey setup** — target weight drives the plan. App reverse-engineers weeks needed based on weekly intensity
- **Milestone roadmap** — full visual roadmap with locked/active/completed states
- **Daily dashboard** — calorie ring, week progress, habits preview, adaptive adjustment banner
- **AI meal logging** — describe any meal, AI estimates calories with breakdown (local fallback if API unavailable)
- **Habits** — goal-based defaults + AI suggestions + custom habits
- **Weekly check-in** — weight + energy + feeling → tier system → adaptive calorie recalculation
- **Journey extension** — auto-extends if significantly behind milestone
- **Persistent state** — localStorage keeps data between sessions

---

## Tech Stack

| Layer    | Tech                        |
|----------|-----------------------------|
| Frontend | React 18, Vite, Recharts    |
| Backend  | Node.js, Express            |
| AI       | Claude Sonnet (Anthropic)   |
| Deploy   | Vercel (both services)      |
| State    | React Context + localStorage|
