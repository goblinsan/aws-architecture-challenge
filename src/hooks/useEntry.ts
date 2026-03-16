/**
 * useEntry – manages anonymous player entry state.
 *
 * On mount:
 *   1. Reads any stored entry ID from localStorage.
 *   2. If found, attempts to re-hydrate the entry from the worker.
 *   3. If the entry is still valid, exposes it directly so the consumer can
 *      skip the join form and go straight to the challenge view.
 *   4. If no entry or the token has expired, the consumer shows the join form.
 *
 * On join:
 *   1. POSTs to the worker to create a new entry.
 *   2. Persists the entry ID in localStorage for re-entry.
 *   3. Exposes the full PlayerEntry object.
 *
 * While active:
 *   - Polls /api/session every 5 seconds to pick up facilitator state changes
 *     (answer reveal, reset) without requiring a page refresh.
 */

import { useState, useEffect, useCallback } from "react";
import type { PlayerEntry, GameConfig, RoundState } from "@content/schema/types";
import { fetchSession, fetchEntry, joinSession, reportError } from "../api/client";

// localStorage key for the persisted entry ID.
const STORAGE_KEY = "awsarch_entry_id";

// How often to poll for session state changes when a player is active (ms).
const POLL_INTERVAL_MS = 5000;

export type EntryStatus =
  | "loading"    // Checking localStorage / fetching session
  | "join"       // No valid entry – show join form
  | "active"     // Valid entry exists – show challenge card
  | "error";     // Unrecoverable error

export interface UseEntryResult {
  status: EntryStatus;
  entry: PlayerEntry | null;
  sessionConfig: GameConfig | null;
  roundState: RoundState | null;
  errorMessage: string | null;
  /** Call from the join form to create a new entry. */
  join: (names: string | [string, string]) => Promise<void>;
  /** Clear the stored entry and return to the join form. */
  clearEntry: () => void;
  /** Re-run the initial load sequence after an error (avoids full page reload). */
  retryLoad: () => void;
}

export function useEntry(): UseEntryResult {
  const [status, setStatus] = useState<EntryStatus>("loading");
  const [entry, setEntry] = useState<PlayerEntry | null>(null);
  const [sessionConfig, setSessionConfig] = useState<GameConfig | null>(null);
  const [roundState, setRoundState] = useState<RoundState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Incrementing this key re-triggers the init effect without a page reload.
  const [loadKey, setLoadKey] = useState(0);

  // ---------------------------------------------------------------------------
  // Clear entry (facilitator reset or manual re-join)
  // ---------------------------------------------------------------------------
  const clearEntry = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setEntry(null);
    setStatus("join");
    setErrorMessage(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Initialise: load session config and attempt re-entry
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setStatus("loading");
      try {
        // Always fetch session config first (needed to render join form correctly).
        const session = await fetchSession();
        if (cancelled) return;
        setSessionConfig(session.config);
        setRoundState(session.state);

        // Attempt re-entry if a stored entry ID exists.
        const storedId = localStorage.getItem(STORAGE_KEY);
        if (storedId) {
          const existing = await fetchEntry(storedId);
          if (cancelled) return;
          if (existing) {
            setEntry(existing);
            setStatus("active");
            return;
          }
          // Entry expired or invalid – clear storage.
          localStorage.removeItem(STORAGE_KEY);
        }

        setStatus("join");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load session";
        reportError(message, { source: "useEntry.init" });
        setErrorMessage(message);
        setStatus("error");
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  // ---------------------------------------------------------------------------
  // Poll session state while a player is active
  // Picks up facilitator transitions (answer_revealed, reset) live.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (status !== "active") return;

    const intervalId = setInterval(() => {
      void (async () => {
        try {
          const session = await fetchSession();
          setRoundState(session.state);
          if (session.state === "reset") {
            clearEntry();
          }
        } catch {
          // Silently swallow polling errors — a transient network blip should
          // not disrupt the player's current view.
        }
      })();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [status, clearEntry]);

  // ---------------------------------------------------------------------------
  // Retry: re-run init without a full page reload
  // ---------------------------------------------------------------------------
  const retryLoad = useCallback(() => {
    setErrorMessage(null);
    setLoadKey((k) => k + 1);
  }, []);

  // ---------------------------------------------------------------------------
  // Join: create a new player entry
  // ---------------------------------------------------------------------------
  const join = useCallback(
    async (names: string | [string, string]) => {
      setStatus("loading");
      try {
        const newEntry = await joinSession(names);
        localStorage.setItem(STORAGE_KEY, newEntry.entryId);
        setEntry(newEntry);
        setStatus("active");
      } catch (err) {
        // Stay on the join form (not the error screen) so the player can
        // correct their input or retry without refreshing the page.
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to join session"
        );
        setStatus("join");
      }
    },
    []
  );

  return {
    status,
    entry,
    sessionConfig,
    roundState,
    errorMessage,
    join,
    clearEntry,
    retryLoad,
  };
}
