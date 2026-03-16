/**
 * Cloudflare Worker – AWS Architecture Challenge API
 *
 * Handles anonymous player entry creation, challenge assignment, hint
 * reveals, session state management, and KV seeding.
 *
 * Routes
 * ------
 * GET  /api/session              – Return current GameConfig + RoundState
 * POST /api/join                 – Create a new PlayerEntry, assign challenge
 * GET  /api/entry/:entryId       – Fetch an existing PlayerEntry (re-entry)
 * POST /api/entry/:entryId/hints/:tier – Reveal a hint tier (1, 2, or 3)
 * POST /api/session/state        – Update round state (facilitator)
 * POST /api/session/reset        – Reset session and clear all entries
 * POST /api/seed                 – Seed game content into KV
 *
 * KV Keys
 * -------
 * session:config   → GameConfig JSON
 * session:state    → RoundState string
 * session:counter  → integer string, incremented per new entry (round-robin)
 * entry:{entryId}  → PlayerEntry JSON
 * challenge:{id}   → ChallengeCard JSON (seeded)
 * constraints      → ConstraintTag[] JSON (seeded)
 * catalogue        → ServiceCatalogue JSON (seeded)
 */

import type {
  GameConfig,
  PlayerEntry,
  RoundState,
  HintTier,
} from "../content/schema/types";
import { loadGameContent } from "../content/seed/index";

// Cache game content at module level — bundled JSON, no network needed.
const GAME_CONTENT = loadGameContent();

const VALID_ROUND_STATES: RoundState[] = [
  "lobby",
  "design_active",
  "answer_revealed",
  "reset",
];

// ---------------------------------------------------------------------------
// Environment bindings
// ---------------------------------------------------------------------------

export interface Env {
  GAME_KV: KVNamespace;
  DEFAULT_CHALLENGE_POOL: string;
  DEFAULT_MODE: string;
  DEFAULT_ASSIGNMENT_STRATEGY: string;
}

// ---------------------------------------------------------------------------
// KV key helpers
// ---------------------------------------------------------------------------

const KV_SESSION_CONFIG = "session:config";
const KV_SESSION_STATE = "session:state";
const KV_SESSION_COUNTER = "session:counter";
const entryKey = (id: string) => `entry:${id}`;
const challengeKey = (id: string) => `challenge:${id}`;

// TTL for player entries: 24 hours in seconds.
const ENTRY_TTL_SECONDS = 60 * 60 * 24;

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------

function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(
  body: unknown,
  status = 200,
  origin: string | null = null
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

function errorResponse(
  message: string,
  status: number,
  origin: string | null = null
): Response {
  return jsonResponse({ error: message }, status, origin);
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

async function getSessionConfig(env: Env): Promise<GameConfig> {
  const raw = await env.GAME_KV.get(KV_SESSION_CONFIG);
  if (raw) {
    return JSON.parse(raw) as GameConfig;
  }
  // Return default config derived from wrangler vars.
  const pool = env.DEFAULT_CHALLENGE_POOL.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    mode: env.DEFAULT_MODE === "pairs" ? "pairs" : "single",
    assignmentStrategy:
      env.DEFAULT_ASSIGNMENT_STRATEGY === "random" ? "random" : "round-robin",
    challengePool: pool,
  };
}

async function getSessionState(env: Env): Promise<RoundState> {
  const raw = await env.GAME_KV.get(KV_SESSION_STATE);
  if (raw === "design_active" || raw === "answer_revealed" || raw === "reset") {
    return raw;
  }
  return "lobby";
}

/**
 * Fetch-and-increment the entry counter for round-robin assignment.
 * Returns the *previous* counter value (zero-based entry index).
 *
 * Note: Cloudflare KV does not provide atomic read-modify-write operations,
 * so two simultaneous joins could read the same counter value and receive the
 * same challenge card. For events with typical participation (5–30 players
 * joining a few seconds apart) this is acceptable — in the worst case two
 * players share a challenge, and the game still functions correctly.
 * If strict uniqueness at high concurrency is required, migrate to a
 * Cloudflare Durable Object which provides serialised access to shared state.
 */
async function nextEntryIndex(env: Env): Promise<number> {
  const raw = await env.GAME_KV.get(KV_SESSION_COUNTER);
  const current = raw ? parseInt(raw, 10) : 0;
  await env.GAME_KV.put(KV_SESSION_COUNTER, String(current + 1));
  return current;
}

// ---------------------------------------------------------------------------
// Challenge assignment
// ---------------------------------------------------------------------------

/**
 * Assign a challenge from the pool.
 * - "round-robin": cycle through pool by entry index, ensuring even spread.
 * - "random": pick a random challenge from the pool.
 *
 * Both strategies wrap around once the pool is exhausted.
 */
function pickChallenge(
  pool: string[],
  strategy: GameConfig["assignmentStrategy"],
  entryIndex: number
): string {
  if (pool.length === 0) {
    throw new Error("Challenge pool is empty");
  }
  if (strategy === "random") {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  // round-robin
  return pool[entryIndex % pool.length];
}

// ---------------------------------------------------------------------------
// Request handlers
// ---------------------------------------------------------------------------

/** GET /api/session */
async function handleGetSession(
  env: Env,
  origin: string | null
): Promise<Response> {
  const [config, state, countRaw] = await Promise.all([
    getSessionConfig(env),
    getSessionState(env),
    env.GAME_KV.get(KV_SESSION_COUNTER),
  ]);
  const entryCount = countRaw ? parseInt(countRaw, 10) : 0;
  return jsonResponse({ config, state, entryCount }, 200, origin);
}

/** POST /api/join */
async function handleJoin(
  request: Request,
  env: Env,
  origin: string | null
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse("Request body must be a JSON object", 400, origin);
  }

  const { names } = body as { names?: unknown };

  // Validate names field
  if (names === undefined || names === null) {
    return errorResponse("names is required", 400, origin);
  }

  const config = await getSessionConfig(env);

  if (config.mode === "pairs") {
    if (
      !Array.isArray(names) ||
      names.length !== 2 ||
      typeof names[0] !== "string" ||
      typeof names[1] !== "string" ||
      names[0].trim() === "" ||
      names[1].trim() === ""
    ) {
      return errorResponse(
        "pairs mode requires names to be an array of exactly two non-empty strings",
        400,
        origin
      );
    }
  } else {
    if (typeof names !== "string" || names.trim() === "") {
      return errorResponse(
        "single mode requires names to be a non-empty string",
        400,
        origin
      );
    }
  }

  // Generate a unique entry ID.
  // crypto.randomUUID() is natively available in Cloudflare Workers (V8 runtime)
  // and avoids an external dependency (e.g. nanoid) while providing
  // cryptographically-random IDs with sufficient entropy for this use case.
  const entryId = crypto.randomUUID();

  // Assign a challenge from the pool.
  const entryIndex = await nextEntryIndex(env);
  const assignedChallengeId = pickChallenge(
    config.challengePool,
    config.assignmentStrategy,
    entryIndex
  );

  const normalizedNames: string | [string, string] =
    config.mode === "pairs"
      ? [(names as string[])[0].trim(), (names as string[])[1].trim()]
      : (names as string).trim();

  const entry: PlayerEntry = {
    entryId,
    names: normalizedNames,
    assignedChallengeId,
    revealedHintTiers: [] as HintTier[],
    joinedAt: new Date().toISOString(),
  };

  // Persist the entry with a TTL so stale entries are cleaned up automatically.
  await env.GAME_KV.put(entryKey(entryId), JSON.stringify(entry), {
    expirationTtl: ENTRY_TTL_SECONDS,
  });

  return jsonResponse(entry, 201, origin);
}

/** GET /api/entry/:entryId */
async function handleGetEntry(
  entryId: string,
  env: Env,
  origin: string | null
): Promise<Response> {
  if (!entryId || entryId.trim() === "") {
    return errorResponse("entryId is required", 400, origin);
  }

  const raw = await env.GAME_KV.get(entryKey(entryId));
  if (!raw) {
    return errorResponse("Entry not found", 404, origin);
  }

  return jsonResponse(JSON.parse(raw) as PlayerEntry, 200, origin);
}

/** POST /api/entry/:entryId/hints/:tier */
async function handleRevealHint(
  entryId: string,
  tierStr: string,
  env: Env,
  origin: string | null
): Promise<Response> {
  const tier = parseInt(tierStr, 10);
  if (tier !== 1 && tier !== 2 && tier !== 3) {
    return errorResponse("Tier must be 1, 2, or 3", 400, origin);
  }

  const raw = await env.GAME_KV.get(entryKey(entryId));
  if (!raw) {
    return errorResponse("Entry not found", 404, origin);
  }

  const entry = JSON.parse(raw) as PlayerEntry;

  if (!entry.revealedHintTiers.includes(tier as HintTier)) {
    entry.revealedHintTiers = [
      ...entry.revealedHintTiers,
      tier as HintTier,
    ].sort((a, b) => a - b) as HintTier[];
    await env.GAME_KV.put(entryKey(entryId), JSON.stringify(entry), {
      expirationTtl: ENTRY_TTL_SECONDS,
    });
  }

  return jsonResponse({ revealedHintTiers: entry.revealedHintTiers }, 200, origin);
}

/** POST /api/session/state */
async function handlePostSessionState(
  request: Request,
  env: Env,
  origin: string | null
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const { state } = body as { state?: unknown };

  if (
    typeof state !== "string" ||
    !(VALID_ROUND_STATES as string[]).includes(state)
  ) {
    return errorResponse(
      `state must be one of: ${VALID_ROUND_STATES.join(", ")}`,
      400,
      origin
    );
  }

  await env.GAME_KV.put(KV_SESSION_STATE, state);
  return jsonResponse({ state }, 200, origin);
}

/** POST /api/session/reset */
async function handleSessionReset(
  env: Env,
  origin: string | null
): Promise<Response> {
  // List and delete all entry keys.
  const list = await env.GAME_KV.list({ prefix: "entry:" });
  await Promise.all(list.keys.map((k) => env.GAME_KV.delete(k.name)));

  await Promise.all([
    env.GAME_KV.put(KV_SESSION_STATE, "lobby"),
    env.GAME_KV.put(KV_SESSION_COUNTER, "0"),
  ]);

  return jsonResponse({ ok: true }, 200, origin);
}

/** POST /api/seed */
async function handleSeed(
  env: Env,
  origin: string | null
): Promise<Response> {
  const content = GAME_CONTENT;

  await Promise.all([
    ...content.challenges.map((c) =>
      env.GAME_KV.put(challengeKey(c.id), JSON.stringify(c))
    ),
    env.GAME_KV.put("constraints", JSON.stringify(content.constraints)),
    env.GAME_KV.put("catalogue", JSON.stringify(content.serviceCatalogue)),
  ]);

  return jsonResponse(
    { ok: true, seededChallenges: content.challenges.length },
    200,
    origin
  );
}

// ---------------------------------------------------------------------------
// Main fetch handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    // Handle CORS preflight requests.
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const { pathname } = url;

    if (pathname === "/api/session" && request.method === "GET") {
      return handleGetSession(env, origin);
    }

    if (pathname === "/api/session/state" && request.method === "POST") {
      return handlePostSessionState(request, env, origin);
    }

    if (pathname === "/api/session/reset" && request.method === "POST") {
      return handleSessionReset(env, origin);
    }

    if (pathname === "/api/join" && request.method === "POST") {
      return handleJoin(request, env, origin);
    }

    if (pathname === "/api/seed" && request.method === "POST") {
      return handleSeed(env, origin);
    }

    const entryMatch = pathname.match(/^\/api\/entry\/([^/]+)$/);
    if (entryMatch && request.method === "GET") {
      return handleGetEntry(entryMatch[1], env, origin);
    }

    const hintMatch = pathname.match(/^\/api\/entry\/([^/]+)\/hints\/(\d+)$/);
    if (hintMatch && request.method === "POST") {
      return handleRevealHint(hintMatch[1], hintMatch[2], env, origin);
    }

    return errorResponse("Not found", 404, origin);
  },
};
