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
 */

import { useState, useEffect, useCallback } from "react";
import type { PlayerEntry, GameConfig, RoundState } from "@content/schema/types";
import { fetchSession, fetchEntry, joinSession } from "../api/client";

// localStorage key for the persisted entry ID.
const STORAGE_KEY = "awsarch_entry_id";

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
}

export function useEntry(): UseEntryResult {
  const [status, setStatus] = useState<EntryStatus>("loading");
  const [entry, setEntry] = useState<PlayerEntry | null>(null);
  const [sessionConfig, setSessionConfig] = useState<GameConfig | null>(null);
  const [roundState, setRoundState] = useState<RoundState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Initialise: load session config and attempt re-entry
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function init() {
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
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load session"
        );
        setStatus("error");
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
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
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to join session"
        );
        setStatus("error");
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Clear entry (facilitator reset or manual re-join)
  // ---------------------------------------------------------------------------
  const clearEntry = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setEntry(null);
    setStatus("join");
    setErrorMessage(null);
  }, []);

  return {
    status,
    entry,
    sessionConfig,
    roundState,
    errorMessage,
    join,
    clearEntry,
  };
}
