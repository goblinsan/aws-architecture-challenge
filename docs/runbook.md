# Event-Day Runbook – AWS Architecture Challenge

A concise operator reference for running the app reliably during a live event.
Keep this open in a browser tab or printed next to you.

---

## Quick Reference

| Action | Command / URL |
|--------|---------------|
| Deploy worker + assets | `npm run build && npm run worker:deploy` |
| Seed game content | `POST /api/seed` |
| Check session state | `GET /api/session` |
| Reset for a new round | `POST /api/session/reset` |
| Start design phase | `POST /api/session/state` `{ "state": "design_active" }` |
| Reveal answers | `POST /api/session/state` `{ "state": "answer_revealed" }` |
| View analytics | `GET /api/analytics` |
| Worker logs (live tail) | `wrangler tail` |

---

## Pre-Event Checklist (30 min before)

### 1 – Deploy Verification

```bash
npm run build
npm run worker:deploy
```

- [ ] Build succeeds with no errors.
- [ ] `wrangler deploy` reports the worker URL.
- [ ] Open the worker URL in a browser — the join page loads without errors.

### 2 – Seed Game Content

```bash
curl -X POST https://<your-worker>.workers.dev/api/seed
# Expected: { "ok": true, "seededChallenges": 7 }
```

- [ ] Response shows `ok: true` and the expected number of challenges.
- [ ] Re-run at any point to overwrite existing content (idempotent).

### 3 – Verify Session State

```bash
curl https://<your-worker>.workers.dev/api/session
# Expected: { "config": { ... }, "state": "lobby", "entryCount": 0 }
```

- [ ] `state` is `"lobby"`.
- [ ] `entryCount` is `0` (or a low number if pre-testing).

### 4 – QR Code Test

1. Display or share the join URL / QR code.
2. Scan with your own phone.
3. Enter a test name and tap **Start Challenge**.
4. [ ] Challenge card loads with title, scenario, and constraints.
5. [ ] Hints tab shows three locked tiers.
6. [ ] Services tab loads the AWS catalogue.

### 5 – Answer Reveal Smoke Test

```bash
# Move to design_active
curl -X POST https://<your-worker>.workers.dev/api/session/state \
  -H "Content-Type: application/json" \
  -d '{"state":"design_active"}'

# Move to answer_revealed
curl -X POST https://<your-worker>.workers.dev/api/session/state \
  -H "Content-Type: application/json" \
  -d '{"state":"answer_revealed"}'
```

- [ ] Player's phone transitions to the reference answer panel within ~5 seconds (polling interval).
- [ ] Answer panel shows summary, core services, tradeoffs, resilience, and security sections.

### 6 – Reset After Smoke Test

```bash
curl -X POST https://<your-worker>.workers.dev/api/session/reset
# Expected: { "ok": true }
```

- [ ] Session resets to `lobby` with `entryCount: 0`.
- [ ] Test player is redirected to the join form within ~5 seconds.

---

## Running a Round

### Round Start Sequence

1. **Display the QR code** — project the join URL or show the QR image.
2. Wait for players to join (watch `entryCount` via `GET /api/session`).
3. **Start the round:**
   ```bash
   curl -X POST .../api/session/state -d '{"state":"design_active"}'
   ```
4. Start your external timer (10 minutes recommended).

### During Design Time

- Players have access to the challenge, hints, and service catalogue tabs.
- Hint reveals are persisted — players can refresh without losing them.
- Check engagement with `GET /api/analytics`.

### Revealing the Answer

```bash
curl -X POST .../api/session/state \
  -H "Content-Type: application/json" \
  -d '{"state":"answer_revealed"}'
```

All player phones transition to the answer panel within ~5 seconds (polled). No manual refresh needed.

### Resetting for the Next Round

```bash
curl -X POST .../api/session/reset
```

- Clears all player entries.
- Resets counter so round-robin assignment restarts from the beginning.
- Re-seed content if you want to change the challenge pool.

---

## Analytics Check

```bash
curl https://<your-worker>.workers.dev/api/analytics
```

Example response:

```json
{
  "joinCount": 23,
  "answerReveals": 1,
  "hintReveals": { "tier1": 18, "tier2": 11, "tier3": 4 },
  "challengeAssignments": {
    "payments-processing": 4,
    "analytics-ingestion": 3,
    ...
  }
}
```

Use this to gauge engagement and which challenges were most popular.

---

## Monitoring & Logs

Tail live worker logs during the event:

```bash
wrangler tail
```

Key log events to watch for:

| `event` field | What it means |
|---|---|
| `player_joined` | Successful join; shows `assignedChallengeId` |
| `hint_revealed` | A player revealed a hint tier |
| `session_state_changed` | Facilitator moved the round state |
| `session_reset` | Session was reset; shows `deletedEntries` count |
| `unhandled_request_error` | Unexpected server error — investigate |
| `client_error_report` | Client-side error reported from a player's browser |

---

## Backup Plan / Incident Procedures

### Worker is unreachable

1. Check [Cloudflare Status](https://www.cloudflarestatus.com/) for outages.
2. Try redeploying: `npm run worker:deploy`.
3. If the domain is down, share the `workers.dev` URL directly as a fallback.

### Players can't join

1. Verify the session state is `"lobby"` via `GET /api/session`.
2. Check that content is seeded via `POST /api/seed`.
3. Check worker logs with `wrangler tail` for error events.

### Answer reveal not showing

The player app polls every 5 seconds. If it still doesn't update:

1. Ask the player to pull-to-refresh or tap the browser refresh button.
2. Their entry will be re-hydrated from the server and the updated state displayed.

### Session data corruption / unexpected state

Run a reset and reseed:

```bash
curl -X POST .../api/session/reset
curl -X POST .../api/seed
```

Then have players rejoin by scanning the QR code again.

### Challenge content looks wrong after seeding

The content is loaded from `content/data/` at build time and bundled into
the worker. To update content:

1. Edit the JSON files under `content/data/`.
2. Rebuild and redeploy: `npm run build && npm run worker:deploy`.
3. Reseed: `POST /api/seed`.

---

## Quick cURL Reference Card

```bash
BASE=https://<your-worker>.workers.dev

# Session info
curl $BASE/api/session

# Seed content
curl -X POST $BASE/api/seed

# State transitions
curl -X POST $BASE/api/session/state -H "Content-Type: application/json" -d '{"state":"lobby"}'
curl -X POST $BASE/api/session/state -H "Content-Type: application/json" -d '{"state":"design_active"}'
curl -X POST $BASE/api/session/state -H "Content-Type: application/json" -d '{"state":"answer_revealed"}'

# Reset
curl -X POST $BASE/api/session/reset

# Analytics
curl $BASE/api/analytics
```
