/**
 * ChallengePage
 *
 * Mobile-first in-round screen with three tabs:
 *  1. Challenge — scenario, difficulty badge, and constraint chips
 *  2. Hints     — progressive tiered hints with sequential unlock
 *  3. Services  — searchable AWS service catalogue grouped by category
 *
 * When the round state is "answer_revealed" all three tabs are replaced by
 * the full reference-answer panel.
 *
 * Layout: sticky top-bar → scrollable content → sticky bottom tab bar.
 * Tab bar is hidden during the answer-reveal phase.
 */

import { useState, useEffect } from "react";
import type { PlayerEntry, RoundState, HintTier } from "@content/schema/types";
import { loadGameContent } from "@content/seed/index";
import ConstraintChip from "../components/ConstraintChip";
import HintPanel from "../components/HintPanel";
import ServiceCataloguePanel from "../components/ServiceCataloguePanel";
import AnswerPanel from "../components/AnswerPanel";

interface ChallengePageProps {
  entry: PlayerEntry;
  roundState: RoundState;
  onLeave: () => void;
}

// Load the full game content bundle once at module level (no network needed).
const gameContent = loadGameContent();

type Tab = "challenge" | "hints" | "services";

// ---------------------------------------------------------------------------
// Tab bar icons (inline SVG — no external dependency)
// ---------------------------------------------------------------------------

function ChallengeIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={`w-5 h-5 ${active ? "fill-aws-orange" : "fill-gray-400"}`}
      aria-hidden="true"
    >
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
    </svg>
  );
}

function HintsIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={`w-5 h-5 ${active ? "fill-aws-orange" : "fill-gray-400"}`}
      aria-hidden="true"
    >
      <path d="M12 2a7 7 0 0 1 4.9 11.9c-.6.6-1.1 1.3-1.3 2.1H8.4c-.2-.8-.7-1.5-1.3-2.1A7 7 0 0 1 12 2zm-1 15h2v2h-2v-2zm0 3h2v1h-2v-1z" />
    </svg>
  );
}

function ServicesIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={`w-5 h-5 ${active ? "fill-aws-orange" : "fill-gray-400"}`}
      aria-hidden="true"
    >
      <path d="M4 6h4v4H4V6zm6 0h4v4h-4V6zm6 0h4v4h-4V6zM4 12h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 18h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ChallengePage({
  entry,
  roundState,
  onLeave,
}: ChallengePageProps) {
  const card = gameContent.challenges.find(
    (c) => c.id === entry.assignedChallengeId
  );

  const [activeTab, setActiveTab] = useState<Tab>("challenge");

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

  const isAnswerRevealed = roundState === "answer_revealed";

  // When the answer is revealed, always switch to the challenge tab so the
  // answer panel is visible immediately.
  useEffect(() => {
    if (isAnswerRevealed) {
      setActiveTab("challenge");
    }
  }, [isAnswerRevealed]);

  // -------------------------------------------------------------------
  // Challenge-not-found fallback
  // -------------------------------------------------------------------
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

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Sticky top bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-aws-dark px-4 py-3 flex items-center justify-between shadow-md">
        <span className="text-aws-orange font-bold text-sm truncate max-w-[60%]">
          {displayName}
        </span>
        <span
          className={`text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full ${
            isAnswerRevealed
              ? "bg-green-500 text-white"
              : roundState === "design_active"
              ? "bg-yellow-400 text-aws-dark"
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

      {/* ── Scrollable content area ────────────────────────────────── */}
      <main
        className="flex-1 overflow-y-auto px-4 pt-4 pb-28"
        id="main-content"
      >
        {/* === ANSWER REVEALED STATE (replaces all tabs) === */}
        {isAnswerRevealed ? (
          <section aria-label="Reference answer">
            {/* Challenge card summary at the top for context */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    card.difficulty === "easy"
                      ? "bg-green-100 text-green-700"
                      : card.difficulty === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {card.difficulty}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {card.title}
              </h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {card.constraints.map((cid) => {
                  const constraint = gameContent.constraints.find(
                    (c) => c.id === cid
                  );
                  if (!constraint) return null;
                  return (
                    <ConstraintChip key={cid} constraint={constraint} />
                  );
                })}
              </div>
            </div>

            <AnswerPanel answer={card.answer} />

            <div className="text-center mt-6">
              <button
                onClick={onLeave}
                className="text-xs text-gray-400 underline min-h-[44px] px-4"
              >
                Leave session
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* === CHALLENGE TAB === */}
            {activeTab === "challenge" && (
              <section aria-label="Challenge overview">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  {/* Difficulty badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        card.difficulty === "easy"
                          ? "bg-green-100 text-green-700"
                          : card.difficulty === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {card.difficulty}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-gray-900 mb-3">
                    {card.title}
                  </h2>

                  {/* Scenario */}
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {card.scenario}
                  </p>

                  {/* Constraint chips */}
                  <div className="mt-5">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Constraints
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {card.constraints.map((cid) => {
                        const constraint = gameContent.constraints.find(
                          (c) => c.id === cid
                        );
                        if (!constraint) return null;
                        return (
                          <ConstraintChip
                            key={cid}
                            constraint={constraint}
                            large
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* === HINTS TAB === */}
            {activeTab === "hints" && (
              <section aria-label="Hints">
                <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                  Hints are revealed one tier at a time. Use them only when you
                  need a nudge — earlier tiers keep the challenge fresh.
                </p>
                <HintPanel
                  hints={card.hints}
                  revealedTiers={revealedTiers}
                  onReveal={revealHint}
                />
              </section>
            )}

            {/* === SERVICES TAB === */}
            {activeTab === "services" && (
              <section aria-label="AWS service catalogue">
                <ServiceCataloguePanel
                  catalogue={gameContent.serviceCatalogue}
                />
              </section>
            )}
          </>
        )}
      </main>

      {/* ── Sticky bottom tab bar (hidden when answer revealed) ────── */}
      {!isAnswerRevealed && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200
                     flex items-stretch shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
          aria-label="Navigation tabs"
        >
          {(
            [
              {
                id: "challenge" as Tab,
                label: "Challenge",
                Icon: ChallengeIcon,
              },
              { id: "hints" as Tab, label: "Hints", Icon: HintsIcon },
              {
                id: "services" as Tab,
                label: "Services",
                Icon: ServicesIcon,
              },
            ] as const
          ).map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-pressed={isActive}
                aria-controls="main-content"
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px]
                            text-xs font-semibold transition-colors
                            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-aws-orange
                            ${isActive ? "text-aws-orange" : "text-gray-400"}`}
              >
                <Icon active={isActive} />
                <span>{label}</span>
              </button>
            );
          })}

          {/* Leave session — placed in the bottom bar */}
          <button
            onClick={onLeave}
            className="flex-none flex flex-col items-center justify-center gap-1 py-3 px-4
                       min-h-[56px] text-xs text-gray-400 font-medium border-l border-gray-100
                       focus:outline-none focus:ring-2 focus:ring-inset focus:ring-aws-orange"
            aria-label="Leave session"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-5 h-5 fill-gray-400"
              aria-hidden="true"
            >
              <path d="M16 13v-2H7V8l-5 4 5 4v-3zM20 3H10c-1.1 0-2 .9-2 2v4h2V5h10v14H10v-4H8v4c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
            </svg>
            <span>Leave</span>
          </button>
        </nav>
      )}
    </div>
  );
}
