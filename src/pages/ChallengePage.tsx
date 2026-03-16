/**
 * ChallengePage
 *
 * Displays the player's assigned challenge card. Shows the scenario, constraint
 * tags, and progressive hint tiers. The answer view is shown when the round
 * state is "answer_revealed".
 *
 * This is the primary in-round screen and is reached immediately after joining.
 * Players return to this page automatically after a refresh or reconnect because
 * the entry ID is persisted in localStorage.
 */

import { useState, useEffect } from "react";
import type { PlayerEntry, RoundState } from "@content/schema/types";
import { loadGameContent } from "@content/seed/index";
import type { ChallengeCard, ConstraintTag, HintTier } from "@content/schema/types";

interface ChallengePageProps {
  entry: PlayerEntry;
  roundState: RoundState;
  onLeave: () => void;
}

// Load the full game content bundle once at module level (no network needed).
const gameContent = loadGameContent();

function getConstraintLabel(
  id: string,
  constraints: ConstraintTag[]
): string {
  return constraints.find((c) => c.id === id)?.label ?? id;
}

export default function ChallengePage({
  entry,
  roundState,
  onLeave,
}: ChallengePageProps) {
  const card: ChallengeCard | undefined = gameContent.challenges.find(
    (c) => c.id === entry.assignedChallengeId
  );

  // Track which hint tiers have been revealed locally (seeded from entry state).
  const [revealedTiers, setRevealedTiers] = useState<Set<HintTier>>(
    () => new Set(entry.revealedHintTiers)
  );

  // Re-seed hint tiers if the entry prop changes (e.g. refreshed from server).
  useEffect(() => {
    setRevealedTiers(new Set(entry.revealedHintTiers));
  }, [entry.revealedHintTiers]);

  function revealHint(tier: HintTier) {
    setRevealedTiers((prev) => new Set([...prev, tier]));
  }

  const displayName = Array.isArray(entry.names)
    ? entry.names.join(" & ")
    : entry.names;

  if (!card) {
    return (
      <div className="min-h-screen bg-aws-dark flex items-center justify-center p-6">
        <div className="text-center text-white">
          <p className="text-xl font-semibold mb-2">Challenge not found</p>
          <p className="text-gray-400 text-sm mb-6">
            The challenge assigned to this entry could not be loaded.
          </p>
          <button
            onClick={onLeave}
            className="text-aws-orange underline text-sm"
          >
            Back to join
          </button>
        </div>
      </div>
    );
  }

  const isAnswerRevealed = roundState === "answer_revealed";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-aws-dark px-4 py-3 flex items-center justify-between">
        <span className="text-aws-orange font-bold text-sm truncate max-w-[60%]">
          {displayName}
        </span>
        <span
          className={`text-xs font-semibold uppercase tracking-widest px-2 py-1 rounded-full ${
            isAnswerRevealed
              ? "bg-green-600 text-white"
              : roundState === "design_active"
              ? "bg-yellow-500 text-aws-dark"
              : "bg-gray-600 text-gray-200"
          }`}
        >
          {isAnswerRevealed
            ? "Answer Revealed"
            : roundState === "design_active"
            ? "Design Time"
            : "Lobby"}
        </span>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* Challenge card */}
        <section className="bg-white shadow-sm rounded-xl mx-4 mt-4 p-5">
          {/* Difficulty badge */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
                card.difficulty === "easy"
                  ? "bg-green-100 text-green-700"
                  : card.difficulty === "medium"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {card.difficulty}
            </span>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-3">{card.title}</h2>
          <p className="text-gray-700 text-sm leading-relaxed">{card.scenario}</p>

          {/* Constraint tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {card.constraints.map((cid) => (
              <span
                key={cid}
                className="bg-aws-dark text-white text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {getConstraintLabel(cid, gameContent.constraints)}
              </span>
            ))}
          </div>
        </section>

        {/* Hints section (only in design active or lobby) */}
        {!isAnswerRevealed && (
          <section className="mx-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Hints
            </h3>
            <div className="space-y-2">
              {card.hints
                .slice()
                .sort((a, b) => a.tier - b.tier)
                .map((hint) => {
                  const revealed = revealedTiers.has(hint.tier);
                  return (
                    <div
                      key={hint.tier}
                      className="bg-white rounded-xl shadow-sm p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Hint {hint.tier}
                        </span>
                        {!revealed && (
                          <button
                            onClick={() => revealHint(hint.tier)}
                            className="text-xs text-aws-orange font-semibold underline"
                          >
                            Reveal
                          </button>
                        )}
                      </div>
                      {revealed ? (
                        <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                          {hint.text}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-gray-300 select-none">
                          ••••••••••••••••••
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* Answer section (revealed when facilitator triggers reveal) */}
        {isAnswerRevealed && (
          <section className="mx-4 mt-4 pb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Reference Answer
            </h3>
            <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                {card.answer.summary}
              </p>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Core Services
                </h4>
                <ul className="list-disc list-inside space-y-0.5">
                  {card.answer.coreServices.map((s) => (
                    <li key={s} className="text-sm text-gray-700">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {card.answer.optionalVariants.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Optional Variants
                  </h4>
                  {card.answer.optionalVariants.map((v) => (
                    <div key={v.title} className="mb-1">
                      <span className="text-sm font-medium text-gray-800">
                        {v.title}
                      </span>
                      <span className="text-sm text-gray-600"> – {v.description}</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Tradeoffs
                </h4>
                <ul className="list-disc list-inside space-y-0.5">
                  {card.answer.tradeoffs.map((t) => (
                    <li key={t} className="text-sm text-gray-700">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Resilience
                </h4>
                <p className="text-sm text-gray-700">{card.answer.resilienceNotes}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Security
                </h4>
                <p className="text-sm text-gray-700">{card.answer.securityNotes}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Why It Fits
                </h4>
                <p className="text-sm text-gray-700">{card.answer.whyItFits}</p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer: leave / re-join link */}
      <footer className="py-3 text-center border-t border-gray-200">
        <button
          onClick={onLeave}
          className="text-xs text-gray-400 underline"
        >
          Leave session
        </button>
      </footer>
    </div>
  );
}
