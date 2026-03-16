import { useState, useEffect, useCallback } from "react";
import type { PlayerEntry } from "@content/schema/types";
import {
  fetchAdminEntries,
  fetchAdminChallenges,
  type AdminChallenge,
} from "../api/client";

const POLL_INTERVAL_MS = 5000;

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-600",
  medium: "bg-yellow-600",
  hard: "bg-red-600",
};

export default function AdminPage() {
  const [entries, setEntries] = useState<PlayerEntry[]>([]);
  const [challengeMap, setChallengeMap] = useState<Record<string, string>>({});
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"players" | "challenges">("players");

  const loadEntries = useCallback(async () => {
    try {
      const data = await fetchAdminEntries();
      setEntries(data.entries);
      setChallengeMap(data.challengeMap);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entries");
    }
  }, []);

  const loadChallenges = useCallback(async () => {
    try {
      const data = await fetchAdminChallenges();
      setChallenges(data.challenges);
    } catch {
      // Non-critical — players tab still works.
    }
  }, []);

  useEffect(() => {
    void loadEntries();
    void loadChallenges();
  }, [loadEntries, loadChallenges]);

  // Auto-refresh entries while on the players tab.
  useEffect(() => {
    if (tab !== "players") return;
    const id = setInterval(() => void loadEntries(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tab, loadEntries]);

  const formatNames = (names: string | [string, string]) =>
    Array.isArray(names) ? names.join(" & ") : names;

  return (
    <div className="min-h-screen bg-aws-dark text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-aws-dark/95 backdrop-blur border-b border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-aws-orange">Admin Dashboard</h1>
          <a
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </a>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("players")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "players"
                ? "bg-aws-orange text-aws-dark"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Players ({entries.length})
          </button>
          <button
            onClick={() => setTab("challenges")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "challenges"
                ? "bg-aws-orange text-aws-dark"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Use Cases ({challenges.length})
          </button>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 mb-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Players tab */}
        {tab === "players" && (
          <>
            {entries.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">
                No players have joined yet.
              </p>
            ) : (
              <div className="space-y-2">
                {entries
                  .sort(
                    (a, b) =>
                      new Date(b.joinedAt).getTime() -
                      new Date(a.joinedAt).getTime()
                  )
                  .map((e) => (
                    <div
                      key={e.entryId}
                      className="bg-gray-800 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {formatNames(e.names)}
                        </p>
                        <p className="text-sm text-gray-400 truncate">
                          {challengeMap[e.assignedChallengeId] ??
                            e.assignedChallengeId}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <div className="flex gap-1">
                          {([1, 2, 3] as const).map((t) => (
                            <span
                              key={t}
                              className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                                e.revealedHintTiers.includes(t)
                                  ? "bg-aws-orange text-aws-dark"
                                  : "bg-gray-700 text-gray-500"
                              }`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(e.joinedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}

        {/* Challenges tab */}
        {tab === "challenges" && (
          <div className="space-y-3">
            {challenges.map((c) => (
              <div
                key={c.id}
                className="bg-gray-800 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{c.title}</h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${DIFFICULTY_COLORS[c.difficulty] ?? "bg-gray-600"}`}
                  >
                    {c.difficulty}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-2">{c.scenario}</p>
                <div className="flex flex-wrap gap-1">
                  {c.constraints.map((cid) => (
                    <span
                      key={cid}
                      className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full"
                    >
                      {cid}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
