import { nanoid } from "nanoid";
import { loadGameContent, assignChallenge } from "../content/seed/index";
import type {
  PlayerEntry,
  ChallengeCard,
  GameConfig,
  RoundState,
  HintTier,
} from "../content/schema/types";

export interface Env {
  GAME_KV: KVNamespace;
  ASSETS: Fetcher;
}

// ---------------------------------------------------------------------------
// KV key helpers
// ---------------------------------------------------------------------------

const KV_SESSION_CONFIG = "session:config";
const KV_SESSION_STATE = "session:state";
const KV_SESSION_ENTRY_COUNT = "session:entries:count";

function kvEntryKey(entryId: string) {
  return `entry:${entryId}`;
}

function kvChallengeKey(challengeId: string) {
  return `challenge:${challengeId}`;
}

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function corsHeaders(): HeadersInit {
  return CORS_HEADERS;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// ---------------------------------------------------------------------------
// Default game config
// ---------------------------------------------------------------------------

function defaultConfig(challenges: ChallengeCard[]): GameConfig {
  return {
    mode: "single",
    assignmentStrategy: "round-robin",
    challengePool: challenges.map((c) => c.id),
  };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handlePostEntries(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as {
    names?: string | [string, string];
    mode?: "single" | "pairs";
  };

  if (!body.names) {
    return errorResponse("names is required");
  }

  // Check session state
  const roundState = ((await env.GAME_KV.get(KV_SESSION_STATE)) ?? "lobby") as RoundState;
  if (roundState !== "lobby") {
    return errorResponse("Session is not accepting new entries right now", 409);
  }

  // Load config
  const configRaw = await env.GAME_KV.get(KV_SESSION_CONFIG);
  let config: GameConfig;
  if (configRaw) {
    config = JSON.parse(configRaw) as GameConfig;
  } else {
    const content = loadGameContent();
    config = defaultConfig(content.challenges);
  }

  // Increment entry count
  const countRaw = await env.GAME_KV.get(KV_SESSION_ENTRY_COUNT);
  const entryIndex = countRaw ? parseInt(countRaw, 10) : 0;
  await env.GAME_KV.put(KV_SESSION_ENTRY_COUNT, String(entryIndex + 1));

  // Assign challenge
  const challengeId = assignChallenge(config.challengePool, entryIndex);

  // Load challenge from KV (or from static content)
  let challenge: ChallengeCard | null = null;
  const challengeRaw = await env.GAME_KV.get(kvChallengeKey(challengeId));
  if (challengeRaw) {
    challenge = JSON.parse(challengeRaw) as ChallengeCard;
  } else {
    const content = loadGameContent();
    challenge = content.challenges.find((c) => c.id === challengeId) ?? null;
  }

  if (!challenge) {
    return errorResponse(`Challenge ${challengeId} not found`, 500);
  }

  // Create entry
  const entry: PlayerEntry = {
    entryId: nanoid(10),
    names: body.names,
    assignedChallengeId: challengeId,
    revealedHintTiers: [],
    joinedAt: new Date().toISOString(),
  };

  await env.GAME_KV.put(kvEntryKey(entry.entryId), JSON.stringify(entry));

  return jsonResponse({ entry, challenge, roundState });
}

async function handleGetEntry(entryId: string, env: Env): Promise<Response> {
  const entryRaw = await env.GAME_KV.get(kvEntryKey(entryId));
  if (!entryRaw) return errorResponse("Entry not found", 404);

  const entry = JSON.parse(entryRaw) as PlayerEntry;
  const roundState = ((await env.GAME_KV.get(KV_SESSION_STATE)) ?? "lobby") as RoundState;

  let challenge: ChallengeCard | null = null;
  const challengeRaw = await env.GAME_KV.get(kvChallengeKey(entry.assignedChallengeId));
  if (challengeRaw) {
    challenge = JSON.parse(challengeRaw) as ChallengeCard;
  } else {
    const content = loadGameContent();
    challenge = content.challenges.find((c) => c.id === entry.assignedChallengeId) ?? null;
  }

  if (!challenge) return errorResponse("Challenge not found", 404);

  return jsonResponse({ entry, challenge, roundState });
}

async function handleRevealHint(
  entryId: string,
  tierStr: string,
  env: Env
): Promise<Response> {
  const tier = parseInt(tierStr, 10);
  if (tier !== 1 && tier !== 2 && tier !== 3) {
    return errorResponse("Tier must be 1, 2, or 3");
  }

  const entryRaw = await env.GAME_KV.get(kvEntryKey(entryId));
  if (!entryRaw) return errorResponse("Entry not found", 404);

  const entry = JSON.parse(entryRaw) as PlayerEntry;

  if (!entry.revealedHintTiers.includes(tier as HintTier)) {
    entry.revealedHintTiers = [...entry.revealedHintTiers, tier as HintTier].sort(
      (a, b) => a - b
    ) as HintTier[];
    await env.GAME_KV.put(kvEntryKey(entryId), JSON.stringify(entry));
  }

  return jsonResponse({ revealedHintTiers: entry.revealedHintTiers });
}

async function handleGetSession(env: Env): Promise<Response> {
  const roundState = ((await env.GAME_KV.get(KV_SESSION_STATE)) ?? "lobby") as RoundState;
  const countRaw = await env.GAME_KV.get(KV_SESSION_ENTRY_COUNT);
  const entryCount = countRaw ? parseInt(countRaw, 10) : 0;
  const configRaw = await env.GAME_KV.get(KV_SESSION_CONFIG);
  const config = configRaw
    ? (JSON.parse(configRaw) as GameConfig)
    : defaultConfig(loadGameContent().challenges);

  return jsonResponse({ roundState, entryCount, config });
}

async function handlePostSessionState(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { state?: RoundState };
  const validStates: RoundState[] = ["lobby", "design_active", "answer_revealed", "reset"];

  if (!body.state || !validStates.includes(body.state)) {
    return errorResponse(`state must be one of: ${validStates.join(", ")}`);
  }

  await env.GAME_KV.put(KV_SESSION_STATE, body.state);
  return jsonResponse({ roundState: body.state });
}

async function handlePostSessionReset(env: Env): Promise<Response> {
  // List and delete all entry keys
  const list = await env.GAME_KV.list({ prefix: "entry:" });
  await Promise.all(list.keys.map((k) => env.GAME_KV.delete(k.name)));

  // Reset state and count
  await env.GAME_KV.put(KV_SESSION_STATE, "lobby");
  await env.GAME_KV.put(KV_SESSION_ENTRY_COUNT, "0");

  return jsonResponse({ ok: true });
}

async function handlePostSeed(env: Env): Promise<Response> {
  const content = loadGameContent();

  // Seed challenges
  await Promise.all(
    content.challenges.map((c) =>
      env.GAME_KV.put(kvChallengeKey(c.id), JSON.stringify(c))
    )
  );

  // Seed constraints, catalogue, and default config
  await env.GAME_KV.put("constraints", JSON.stringify(content.constraints));
  await env.GAME_KV.put("catalogue", JSON.stringify(content.serviceCatalogue));
  await env.GAME_KV.put(KV_SESSION_CONFIG, JSON.stringify(defaultConfig(content.challenges)));

  return jsonResponse({ ok: true, seededChallenges: content.challenges.length });
}

// ---------------------------------------------------------------------------
// Main fetch handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const reqMethod = request.method;

    // Handle CORS preflight
    if (reqMethod === "OPTIONS" && pathname.startsWith("/api/")) {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Route: POST /api/entries
    if (reqMethod === "POST" && pathname === "/api/entries") {
      return handlePostEntries(request, env);
    }

    // Route: GET /api/entries/:entryId
    const entryMatch = pathname.match(/^\/api\/entries\/([^/]+)$/);
    if (reqMethod === "GET" && entryMatch) {
      return handleGetEntry(entryMatch[1], env);
    }

    // Route: POST /api/entries/:entryId/hints/:tier
    const hintMatch = pathname.match(/^\/api\/entries\/([^/]+)\/hints\/(\d+)$/);
    if (reqMethod === "POST" && hintMatch) {
      return handleRevealHint(hintMatch[1], hintMatch[2], env);
    }

    // Route: GET /api/session
    if (reqMethod === "GET" && pathname === "/api/session") {
      return handleGetSession(env);
    }

    // Route: POST /api/session/state
    if (reqMethod === "POST" && pathname === "/api/session/state") {
      return handlePostSessionState(request, env);
    }

    // Route: POST /api/session/reset
    if (reqMethod === "POST" && pathname === "/api/session/reset") {
      return handlePostSessionReset(env);
    }

    // Route: POST /api/seed
    if (reqMethod === "POST" && pathname === "/api/seed") {
      return handlePostSeed(env);
    }

    // Catch-all: serve static assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return errorResponse("Not found", 404);
  },
} satisfies ExportedHandler<Env>;
