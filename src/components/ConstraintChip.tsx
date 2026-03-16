/**
 * ConstraintChip
 *
 * Renders a single constraint tag as a visually distinct, color-coded chip.
 * Each constraint type has a unique color to aid quick visual scanning.
 * The chip title attribute shows the full constraint description on hover/focus.
 */

import type { ConstraintTag } from "@content/schema/types";

/** Tailwind classes per constraint id — static strings for Tailwind JIT. */
const CONSTRAINT_COLORS: Record<string, string> = {
  "high-volume":             "bg-blue-100  text-blue-800  border-blue-200",
  "pci-compliance":          "bg-red-100   text-red-800   border-red-200",
  "low-latency":             "bg-yellow-100 text-yellow-800 border-yellow-200",
  "global-accessibility":    "bg-purple-100 text-purple-800 border-purple-200",
  "multi-region-resilience": "bg-green-100 text-green-800 border-green-200",
  "cost-sensitivity":        "bg-cyan-100  text-cyan-800  border-cyan-200",
  "near-real-time":          "bg-orange-100 text-orange-800 border-orange-200",
  "operational-simplicity":  "bg-gray-100  text-gray-700  border-gray-200",
};

interface ConstraintChipProps {
  constraint: ConstraintTag;
  /** When true, render a larger variant suitable for standalone display */
  large?: boolean;
}

export default function ConstraintChip({
  constraint,
  large = false,
}: ConstraintChipProps) {
  const colorClass =
    CONSTRAINT_COLORS[constraint.id] ??
    "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span
      className={`inline-flex items-center border font-semibold rounded-full select-none
        ${large ? "text-sm px-3.5 py-1.5" : "text-xs px-3 py-1"}
        ${colorClass}`}
      title={constraint.description}
      aria-label={`${constraint.label}: ${constraint.description}`}
    >
      {constraint.label}
    </span>
  );
}
