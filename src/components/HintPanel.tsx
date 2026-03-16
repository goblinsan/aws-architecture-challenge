/**
 * HintPanel
 *
 * Renders the three progressive hint tiers for a challenge card.
 * Rules:
 *  - Tier 1 is always unlockable.
 *  - Tier 2 is only unlockable once tier 1 has been revealed.
 *  - Tier 3 is only unlockable once tier 2 has been revealed.
 *  - Each locked tier shows a "reveal previous hint first" message.
 * Timing guidance is shown on every card to help players self-pace.
 */

import type { Hint, HintTier } from "@content/schema/types";

const HINT_TIMING: Record<HintTier, string> = {
  1: "Available from the start",
  2: "Suggested after ~3 min",
  3: "Suggested after ~6 min",
};

interface HintPanelProps {
  hints: Hint[];
  revealedTiers: Set<HintTier>;
  onReveal: (tier: HintTier) => void;
}

export default function HintPanel({
  hints,
  revealedTiers,
  onReveal,
}: HintPanelProps) {
  const sorted = [...hints].sort((a, b) => a.tier - b.tier);

  return (
    <div className="space-y-3" role="list" aria-label="Hints">
      {sorted.map((hint) => {
        const revealed = revealedTiers.has(hint.tier);
        const prevTier = (hint.tier - 1) as HintTier;
        const locked = hint.tier > 1 && !revealedTiers.has(prevTier);

        return (
          <div
            key={hint.tier}
            role="listitem"
            className={`bg-white rounded-2xl shadow-sm border p-4 transition-opacity ${
              locked ? "opacity-50 border-gray-100" : "border-gray-100"
            }`}
          >
            {/* Tier header row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {/* Tier number badge */}
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    revealed
                      ? "bg-aws-orange text-aws-dark"
                      : locked
                      ? "bg-gray-200 text-gray-400"
                      : "bg-amber-100 text-amber-700"
                  }`}
                  aria-hidden="true"
                >
                  {hint.tier}
                </span>
                <span className="text-xs text-gray-400">
                  {HINT_TIMING[hint.tier]}
                </span>
              </div>

              {/* Action area */}
              {revealed ? (
                <span className="text-xs font-medium text-green-600">
                  Revealed ✓
                </span>
              ) : locked ? (
                <span className="text-xs text-gray-400 italic">
                  Reveal hint {hint.tier - 1} first
                </span>
              ) : (
                <button
                  onClick={() => onReveal(hint.tier)}
                  className="flex-shrink-0 min-h-[44px] min-w-[72px] text-sm font-semibold
                             text-aws-orange bg-amber-50 rounded-xl px-3 py-2
                             focus:outline-none focus:ring-2 focus:ring-aws-orange active:bg-amber-100"
                  aria-label={`Reveal hint ${hint.tier}`}
                >
                  Reveal
                </button>
              )}
            </div>

            {/* Hint body */}
            {revealed ? (
              <p className="mt-3 text-sm text-gray-700 leading-relaxed">
                {hint.text}
              </p>
            ) : (
              !locked && (
                <p
                  className="mt-3 text-sm text-gray-300 select-none tracking-widest"
                  aria-hidden="true"
                >
                  ••••••••••••••••••
                </p>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
