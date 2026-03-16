import { useState, useEffect, useCallback } from "react";
import type { PlayerEntry } from "@content/schema/types";
import {
  fetchAdminEntries,
  fetchAdminChallenges,
  deleteAdminEntry,
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
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);
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

  const handleDelete = useCallback(
    async (entryId: string) => {
      try {
        await deleteAdminEntry(entryId);
        setEntries((prev) => prev.filter((e) => e.entryId !== entryId));
      } catch {
        setError("Failed to remove player");
      }
    },
    []
  );

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
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-8">
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
                        <button
                          onClick={() => void handleDelete(e.entryId)}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1"
                          title="Remove player"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
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
            {challenges.map((c) => {
              const isOpen = expandedChallenge === c.id;
              const a = c.answer;
              return (
                <div
                  key={c.id}
                  className="bg-gray-800 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedChallenge(isOpen ? null : c.id)
                    }
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{c.title}</h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${DIFFICULTY_COLORS[c.difficulty] ?? "bg-gray-600"}`}
                      >
                        {c.difficulty}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-300">{c.scenario}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.constraints.map((cid) => (
                        <span
                          key={cid}
                          className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full"
                        >
                          {cid}
                        </span>
                      ))}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-700 px-4 pb-4 pt-3 space-y-4">
                      {/* Summary */}
                      <div>
                        <h4 className="text-xs font-bold text-aws-orange uppercase tracking-wider mb-1">
                          Reference Architecture
                        </h4>
                        <p className="text-sm text-gray-300">{a.summary}</p>
                      </div>

                      {/* Core Services */}
                      <div>
                        <h4 className="text-xs font-bold text-aws-orange uppercase tracking-wider mb-1">
                          Core Services
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {a.coreServices.map((s) => (
                            <span
                              key={s}
                              className="text-xs bg-gray-700 text-gray-200 px-2 py-1 rounded"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Why It Fits */}
                      <div>
                        <h4 className="text-xs font-bold text-aws-orange uppercase tracking-wider mb-1">
                          Why It Fits
                        </h4>
                        <p className="text-sm text-gray-300">{a.whyItFits}</p>
                      </div>

                      {/* Tradeoffs */}
                      {a.tradeoffs.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-aws-orange uppercase tracking-wider mb-1">
                            Tradeoffs
                          </h4>
                          <ul className="list-disc list-inside space-y-1">
                            {a.tradeoffs.map((t, i) => (
                              <li
                                key={i}
                                className="text-sm text-gray-300"
                              >
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Alternative Approaches */}
                      {a.optionalVariants.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-aws-orange uppercase tracking-wider mb-1">
                            Alternative Approaches
                          </h4>
                          <div className="space-y-2">
                            {a.optionalVariants.map((v) => (
                              <div key={v.title}>
                                <p className="text-sm font-medium text-gray-200">
                                  {v.title}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {v.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resilience */}
                      <div>
                        <h4 className="text-xs font-bold text-aws-orange uppercase tracking-wider mb-1">
                          Resilience
                        </h4>
                        <p className="text-sm text-gray-300">
                          {a.resilienceNotes}
                        </p>
                      </div>

                      {/* Security */}
                      <div>
                        <h4 className="text-xs font-bold text-aws-orange uppercase tracking-wider mb-1">
                          Security
                        </h4>
                        <p className="text-sm text-gray-300">
                          {a.securityNotes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
