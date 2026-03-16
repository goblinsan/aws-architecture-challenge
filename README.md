# AWS Architecture Challenge

A short-lived, mobile-first TypeScript web app hosted on Cloudflare for a live AWS architecture game.

Players join via QR code, receive a unique entry and assigned use case, review constraints and optional hints, sketch an architecture on paper or whiteboard, and then compare their design to a well-architected reference answer at the end of the round.


## Overview

- **Audience**: AWS builders, internal event participants, facilitator / event host
- **Round length**: ~20 minutes (10 minute design time)
- **Stack**: TypeScript + React + Vite, Tailwind CSS, Cloudflare Workers + KV

## Principles

- Mobile-first, laptop-friendly UX
- Zero required user auth
- Unique player entry per participant or pair
- Quick load over QR code
- Facilitator-friendly reveal flow
- Curated AWS service catalogue by category

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TypeScript + React + Vite |
| Styling | Tailwind CSS |
| Hosting | Cloudflare Workers with static assets |
| Runtime API | Cloudflare Worker routes |
| Storage | Cloudflare KV (short-lived session/entry state) |
| Optional State | Durable Object for live round control |

---

## Local Development

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed via `npm ci`)
- A [Cloudflare account](https://dash.cloudflare.com/) (free tier is sufficient)

### 1. Install dependencies

```bash
npm ci
```

### 2. Start local dev server

In two terminals:

```bash
# Terminal 1: Vite frontend dev server (http://localhost:5173)
npm run dev

# Terminal 2: Cloudflare Worker local dev (http://localhost:8787)
npm run worker:dev
```

Vite proxies `/api` requests to the worker automatically. Open `http://localhost:5173` in your browser.

> **Note**: On first run against a fresh local KV, call `POST /api/seed` to populate content, or rely on the worker's built-in JSON fallback.

### 3. Seed content (optional, local)

```bash
curl -X POST http://localhost:8787/api/seed
```

This writes all challenges, constraints, and the service catalogue into the local KV namespace.

### 4. Type-check, lint, build

```bash
npm run typecheck   # TypeScript across frontend and worker
npm run lint        # ESLint
npm run build       # Vite + tsc production build → dist/
```

---

## Deployment

### Prerequisites

Set the following environment variables (or use `wrangler login`):

```bash
cp .env.example .env
# Fill in CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN
```

### 1. Create KV namespaces

```bash
# Production namespace
wrangler kv:namespace create GAME_KV

# Preview namespace (for wrangler dev --remote)
wrangler kv:namespace create GAME_KV --preview
```

Copy the returned `id` and `preview_id` values into `worker/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "GAME_KV"
id = "<production-kv-id>"
preview_id = "<preview-kv-id>"
```

### 2. Build and deploy

```bash
npm run build
npm run worker:deploy
```

### 3. Seed production content

```bash
curl -X POST https://<your-worker-subdomain>.workers.dev/api/seed
```

---

## Event Operator Guide

### Pre-event checklist

1. **Deploy** the latest build to production.
2. **Seed content** by calling `POST /api/seed` — this loads all challenges and the service catalogue into KV and sets the state to `lobby`.
3. **Confirm** the session is in `lobby` state: `GET /api/session`
4. **Generate a QR code** pointing to your Worker URL and project it for attendees.

### Starting a round

1. Players scan the QR code, enter their name, and receive a unique challenge card (assigned round-robin from the pool).
2. When all players have joined, move the session to `design_active`:
   ```bash
   curl -X POST https://<worker-url>/api/session/state \
     -H "Content-Type: application/json" \
     -d '{"state": "design_active"}'
   ```
3. Start the 10-minute timer.

### Revealing answers

When design time is up, trigger the reveal:

```bash
curl -X POST https://<worker-url>/api/session/state \
  -H "Content-Type: application/json" \
  -d '{"state": "answer_revealed"}'
```

All player views will transition to the reference answer and debrief screen on their next interaction.

### Resetting for a new round

```bash
curl -X POST https://<worker-url>/api/session/reset
```

This clears all player entries, resets the entry counter, and returns the session to `lobby`. Players are redirected to the join form on next page load.

### Session state transitions

```
LOBBY → DESIGN_ACTIVE → ANSWER_REVEALED → RESET → LOBBY
```

Use `GET /api/session` at any time to inspect the current state and entry count.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/entries` | Create a new player entry (join) |
| `GET` | `/api/entries/:entryId` | Get a player entry and its challenge |
| `POST` | `/api/entries/:entryId/hints/:tier` | Reveal a hint tier (1, 2, or 3) |
| `GET` | `/api/session` | Get current session state, entry count, and config |
| `POST` | `/api/session/state` | Update round state (facilitator) |
| `POST` | `/api/session/reset` | Reset session and clear all entries |
| `POST` | `/api/seed` | Seed game content into KV |

---

## Project Structure

```
aws-architecture-challenge/
├── content/
│   ├── data/           # Static JSON content (challenges, constraints, services)
│   ├── schema/         # Shared TypeScript types
│   └── seed/           # Content loader helpers
├── src/                # React + Vite frontend
│   ├── api/
│   │   └── client.ts   # Typed API client
│   ├── hooks/
│   │   └── useEntry.ts # Player entry state hook
│   ├── pages/
│   │   ├── JoinPage.tsx      # QR landing / name entry form
│   │   └── ChallengePage.tsx # Challenge card, hints, answer reveal
│   ├── App.tsx         # Root component (routing by entry status)
│   ├── main.tsx        # React entry point
│   └── index.css       # Tailwind CSS
├── worker/
│   ├── index.ts        # Cloudflare Worker with all API routes
│   ├── tsconfig.json   # Worker-specific TypeScript config
│   └── wrangler.toml   # Cloudflare deployment config
├── public/
│   └── favicon.svg
├── docs/
│   └── game-loop.md    # Full event game loop documentation
└── .github/
    └── workflows/
        └── ci.yml      # CI: typecheck, lint, build on PRs
```

---

## Contributing

See the project board for milestones, epics, and issues.





