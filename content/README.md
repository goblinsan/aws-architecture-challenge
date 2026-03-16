# Game Content

This directory contains the source-of-truth game data for the AWS Architecture Challenge. All content is stored as plain JSON files and TypeScript interfaces so it can be edited before an event without deploying code and seeded into the app without admin authentication.

---

## Directory Structure

```
content/
├── schema/
│   └── types.ts          # TypeScript interfaces for all game entities
├── data/
│   ├── constraints.json  # Reusable constraint definitions (8 constraints)
│   ├── challenges.json   # 7 challenge cards (scenarios, hints, answers)
│   └── services.json     # AWS service catalogue grouped by category
├── seed/
│   └── index.ts          # Typed content loader — no auth required
└── README.md             # This file
```

---

## Editing Content Before an Event

### Adding or Changing a Challenge (`data/challenges.json`)

Each challenge object has the following fields:

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Unique slug — use kebab-case, e.g. `"real-time-bidding"` |
| `title` | `string` | Displayed at the top of the challenge card |
| `scenario` | `string` | 2–4 sentences describing the business problem |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | Used for session balancing |
| `constraints` | `ConstraintId[]` | 2–4 IDs from `constraints.json` |
| `hints` | `Hint[]` | Exactly 3 hints with `tier` 1, 2, and 3 |
| `answer` | `Answer` | Reference answer shown after design time ends |

**Constraint IDs** available for use:

| ID | Label |
|----|-------|
| `high-volume` | High Volume |
| `pci-compliance` | PCI Compliance |
| `low-latency` | Low Latency |
| `global-accessibility` | Global Accessibility |
| `multi-region-resilience` | Multi-Region Resilience |
| `cost-sensitivity` | Cost Sensitive |
| `near-real-time` | Near Real-Time |
| `operational-simplicity` | Operational Simplicity |

**Hint tiers** must follow this escalation pattern:
- **Tier 1** — Broad conceptual guidance. Does not name AWS services.
- **Tier 2** — Directional guidance. May reference AWS patterns or service categories.
- **Tier 3** — Specific direction. Names key AWS services and how they fit together.

**Answer fields**:

| Field | Type | Notes |
|-------|------|-------|
| `summary` | `string` | 2–3 sentence overview of the solution |
| `coreServices` | `string[]` | Primary AWS service names (e.g. `"Amazon SQS"`) |
| `optionalVariants` | `AnswerVariant[]` | Alternative approaches — `{ title, description }` |
| `tradeoffs` | `string[]` | Design decisions and what was sacrificed |
| `resilienceNotes` | `string` | How the architecture handles failures |
| `securityNotes` | `string` | How security and compliance are addressed |
| `whyItFits` | `string` | Why chosen services satisfy the constraints |

### Adding a New Constraint (`data/constraints.json`)

Add a new entry to the `constraints` array. The `id` field must also be added to the `ConstraintId` type in `schema/types.ts` before use in challenges.

### Adding a New Service (`data/services.json`)

Add a new entry to the `services` array. Choose a `category` from the existing categories list. The `description` should be a single plain-language sentence suitable for mobile viewing.

---

## Loading Content in the App

### Option 1 — Module Import (Cloudflare Workers / Node.js)

```typescript
import { loadGameContent } from "./content/seed";

const content = loadGameContent();
// content.challenges, content.constraints, content.serviceCatalogue
```

This bundles the JSON files at build time — zero network requests at runtime.

### Option 2 — Fetch from Static Assets (Browser)

Serve the `content/data/` directory as static files (e.g. via Cloudflare Workers static assets) and load at runtime:

```typescript
import { fetchGameContent } from "./content/seed";

const content = await fetchGameContent("/content/data");
```

### Assigning Challenges to Players

The `assignChallenge` helper implements round-robin assignment from the challenge pool:

```typescript
import { loadGameContent, assignChallenge } from "./content/seed";

const content = loadGameContent();
const pool = content.challenges.map((c) => c.id);

// Assign challenge to the 4th player to join (zero-based index 3)
const challengeId = assignChallenge(pool, 3);
```

---

## Content Validation

The TypeScript types in `schema/types.ts` act as compile-time validation. If you are editing JSON files directly, ensure:

1. Every challenge has exactly **three hints** with `tier` values `1`, `2`, and `3`.
2. All `constraints` IDs in a challenge exist in `constraints.json`.
3. No challenge uses `CloudFront` or `Static S3 Website Hosting` as a core service or primary solution path (per project requirements).
4. Service IDs in `services.json` are unique slugs in kebab-case.

---

## Challenge Inventory

| ID | Title | Difficulty | Constraints |
|----|-------|------------|-------------|
| `payments-processing` | Payments Processing | Medium | High Volume, PCI Compliance, Low Latency |
| `analytics-ingestion` | Analytics Ingestion | Medium | High Volume, Near Real-Time |
| `event-driven-onboarding` | Event-Driven Employee Onboarding | Easy | Operational Simplicity, Cost Sensitive |
| `media-processing` | Video Transcoding Pipeline | Medium | High Volume, Cost Sensitive |
| `global-customer-support` | Global Customer Support Platform | Hard | Global Accessibility, Multi-Region Resilience |
| `iot-telemetry` | IoT Telemetry and Anomaly Detection | Hard | High Volume, Near Real-Time |
| `internal-api-platform` | Internal API Platform | Easy | Low Latency, Operational Simplicity |
