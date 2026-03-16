import { useState } from "react";
import type { ChallengeCard, PlayerEntry, RoundState, ServiceCategory } from "../content/schema/types";
import type { JoinResponse, HintRevealResponse } from "./types";

type Tab = "challenge" | "services" | "hints";

interface AppState {
  entry: PlayerEntry | null;
  challenge: ChallengeCard | null;
  roundState: RoundState | null;
  loading: boolean;
  error: string | null;
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  "compute",
  "storage",
  "databases",
  "integration",
  "security",
  "networking",
  "observability",
  "analytics",
];

export default function App() {
  const [state, setState] = useState<AppState>({
    entry: null,
    challenge: null,
    roundState: null,
    loading: false,
    error: null,
  });
  const [name, setName] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("challenge");
  const [revealedTiers, setRevealedTiers] = useState<number[]>([]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: name.trim(), mode: "single" }),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        throw new Error(error ?? "Failed to join");
      }
      const data = (await res.json()) as JoinResponse;
      setState({
        entry: data.entry,
        challenge: data.challenge,
        roundState: data.roundState,
        loading: false,
        error: null,
      });
      setRevealedTiers(data.entry.revealedHintTiers.map((t) => t as number));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  };

  const handleRevealHint = async (tier: number) => {
    if (!state.entry) return;
    try {
      const res = await fetch(`/api/entries/${state.entry.entryId}/hints/${tier}`, {
        method: "POST",
      });
      if (!res.ok) return;
      const data = (await res.json()) as HintRevealResponse;
      setRevealedTiers(data.revealedHintTiers);
    } catch {
      // ignore hint errors
    }
  };

  if (!state.entry || !state.challenge) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            AWS Architecture Challenge
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">Enter your name to join</p>

          {state.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {state.error}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={state.loading}
            />
            <button
              type="submit"
              disabled={state.loading || !name.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-lg px-4 py-3 transition-colors"
            >
              {state.loading ? "Joining…" : "Join Challenge"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { challenge } = state;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-blue-700 text-white px-4 py-3">
        <p className="text-xs uppercase tracking-wide opacity-75">
          {state.entry.names as string}
        </p>
        <h1 className="text-lg font-bold leading-tight">{challenge.title}</h1>
        <span className="inline-block mt-1 text-xs bg-blue-500 rounded-full px-2 py-0.5 capitalize">
          {challenge.difficulty}
        </span>
      </header>

      {/* Tab content */}
      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {activeTab === "challenge" && (
          <div className="space-y-4">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Scenario
              </h2>
              <p className="text-gray-800 leading-relaxed">{challenge.scenario}</p>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Constraints
              </h2>
              <ul className="flex flex-wrap gap-2">
                {challenge.constraints.map((c) => (
                  <li
                    key={c}
                    className="bg-amber-100 text-amber-800 text-xs font-medium rounded-full px-3 py-1"
                  >
                    {c.replace(/-/g, " ")}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {activeTab === "hints" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Reveal hints only when you need them!</p>
            {challenge.hints.map((hint) => {
              const isRevealed = revealedTiers.includes(hint.tier);
              return (
                <div
                  key={hint.tier}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="font-semibold text-gray-700">Hint {hint.tier}</span>
                    {!isRevealed && (
                      <button
                        onClick={() => handleRevealHint(hint.tier)}
                        className="text-sm text-blue-600 font-medium hover:underline"
                      >
                        Reveal
                      </button>
                    )}
                  </div>
                  {isRevealed && (
                    <div className="px-4 pb-3 text-sm text-gray-700 border-t border-gray-100 pt-2">
                      {hint.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "services" && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 mb-3">Browse AWS service categories</p>
            {SERVICE_CATEGORIES.map((cat) => (
              <div
                key={cat}
                className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3"
              >
                <span className="text-lg">
                  {
                    {
                      compute: "⚙️",
                      storage: "🗄️",
                      databases: "🛢️",
                      integration: "🔗",
                      security: "🔒",
                      networking: "🌐",
                      observability: "📊",
                      analytics: "📈",
                    }[cat]
                  }
                </span>
                <span className="font-medium text-gray-800 capitalize">{cat}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-200 flex">
        {(["challenge", "hints", "services"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-semibold capitalize transition-colors ${
              activeTab === tab ? "text-blue-600 border-t-2 border-blue-600" : "text-gray-500"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}
