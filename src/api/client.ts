/**
 * Typed API client for the AWS Architecture Challenge worker.
 *
 * All functions throw on network errors. Callers should wrap in try/catch.
 */

import type { GameConfig, PlayerEntry, RoundState, HintTier, Difficulty, ConstraintId, Answer } from "@content/schema/types";

// ---------------------------------------------------------------------------
// Response shapes returned by the worker
// ---------------------------------------------------------------------------

export interface SessionResponse {
  config: GameConfig;
  state: RoundState;
}

export interface JoinRequest {
  /** Single name string (single mode) or [name1, name2] tuple (pairs mode). */
  names: string | [string, string];
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * Fetch the current session configuration and round state.
 */
export async function fetchSession(): Promise<SessionResponse> {
  const res = await fetch("/api/session");
  if (!res.ok) {
    throw new Error(`Failed to fetch session: ${res.status}`);
  }
  return res.json() as Promise<SessionResponse>;
}

/**
 * Create a new anonymous player entry and receive an assigned challenge.
 *
 * @param names - Player name (single mode) or [name1, name2] (pairs mode).
 */
export async function joinSession(names: JoinRequest["names"]): Promise<PlayerEntry> {
  const res = await fetch("/api/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ names }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(
      (err as { error?: string }).error ?? `Join failed: ${res.status}`
    );
  }

  return res.json() as Promise<PlayerEntry>;
}

/**
 * Fetch an existing player entry by its entry ID. Used for re-entry on refresh.
 * Returns null if the entry is not found (expired or invalid token).
 */
export async function fetchEntry(entryId: string): Promise<PlayerEntry | null> {
  const res = await fetch(`/api/entry/${encodeURIComponent(entryId)}`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch entry: ${res.status}`);
  }
  return res.json() as Promise<PlayerEntry>;
}

/**
 * Persist a hint tier reveal to the worker so it survives page refreshes.
 * Returns the updated list of revealed hint tiers for the entry.
 */
export async function revealHintTier(
  entryId: string,
  tier: HintTier
): Promise<HintTier[]> {
  const res = await fetch(
    `/api/entry/${encodeURIComponent(entryId)}/hints/${tier}`,
    { method: "POST" }
  );
  if (!res.ok) {
    throw new Error(`Hint reveal failed: ${res.status}`);
  }
  const data = (await res.json()) as { revealedHintTiers: HintTier[] };
  return data.revealedHintTiers;
}

/**
 * Send a client-side error report to the worker for structured logging.
 * Fire-and-forget — errors in this call are silently swallowed.
 */
export function reportError(
  message: string,
  context?: Record<string, unknown>
): void {
  void fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level: "error", message, context }),
  }).catch(() => {
    // Silently ignore failures in error reporting to avoid recursive loops.
  });
}

// ---------------------------------------------------------------------------
// Admin API calls
// ---------------------------------------------------------------------------

export interface AdminEntriesResponse {
  entries: PlayerEntry[];
  challengeMap: Record<string, string>;
}

export interface AdminChallenge {
  id: string;
  title: string;
  difficulty: Difficulty;
  scenario: string;
  constraints: ConstraintId[];
  answer: Answer;
}

export interface AdminChallengesResponse {
  challenges: AdminChallenge[];
}

export async function fetchAdminEntries(): Promise<AdminEntriesResponse> {
  const res = await fetch("/api/admin/entries");
  if (!res.ok) {
    throw new Error(`Failed to fetch admin entries: ${res.status}`);
  }
  return res.json() as Promise<AdminEntriesResponse>;
}

export async function fetchAdminChallenges(): Promise<AdminChallengesResponse> {
  const res = await fetch("/api/admin/challenges");
  if (!res.ok) {
    throw new Error(`Failed to fetch challenges: ${res.status}`);
  }
  return res.json() as Promise<AdminChallengesResponse>;
}

export async function deleteAdminEntry(entryId: string): Promise<void> {
  const res = await fetch(`/api/admin/entry/${encodeURIComponent(entryId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete entry: ${res.status}`);
  }
}

export async function toggleAnswerVisibility(
  entryId: string,
  visible: boolean
): Promise<void> {
  const res = await fetch(
    `/api/admin/entry/${encodeURIComponent(entryId)}/answer`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to toggle answer visibility: ${res.status}`);
  }
}
