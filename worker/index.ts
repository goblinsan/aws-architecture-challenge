/**
 * Cloudflare Worker – AWS Architecture Challenge API
 *
 * Handles anonymous player entry creation, challenge assignment, and
 * session state retrieval. Persists all data in Cloudflare KV.
 *
 * Routes
 * ------
 * GET  /api/session              – Return current GameConfig + RoundState
 * POST /api/join                 – Create a new PlayerEntry, assign challenge
 * GET  /api/entry/:entryId       – Fetch an existing PlayerEntry (re-entry)
 *
 * KV Keys
 * -------
 * session:config   → GameConfig JSON
 * session:state    → RoundState string
 * session:counter  → integer string, incremented per new entry (round-robin)
 * entry:{entryId}  → PlayerEntry JSON
 */

import type {
  GameConfig,
  PlayerEntry,
  RoundState,
  HintTier,
} from "../content/schema/types";

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
  const pool = env.DEFAULT_CHALLENGE_POOL.split(",").map((s) => s.trim()).filter(Boolean);
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
  const [config, state] = await Promise.all([
    getSessionConfig(env),
    getSessionState(env),
  ]);
  return jsonResponse({ config, state }, 200, origin);
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

  // Generate a unique entry ID (crypto.randomUUID is available in CF Workers).
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

    if (pathname === "/api/join" && request.method === "POST") {
      return handleJoin(request, env, origin);
    }

    const entryMatch = pathname.match(/^\/api\/entry\/([^/]+)$/);
    if (entryMatch && request.method === "GET") {
      return handleGetEntry(entryMatch[1], env, origin);
    }

    return errorResponse("Not found", 404, origin);
  },
};
