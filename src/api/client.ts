/**
 * Typed API client for the AWS Architecture Challenge worker.
 *
 * All functions throw on network errors. Callers should wrap in try/catch.
 */

import type { GameConfig, PlayerEntry, RoundState } from "@content/schema/types";

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
