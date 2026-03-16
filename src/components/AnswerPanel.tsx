/**
 * AnswerPanel
 *
 * Polished reference-answer view revealed after the facilitator calls time.
 * Sections are collapsible via accordion to reduce vertical scroll on mobile.
 * All sections start open so the full answer is immediately visible on a
 * facilitator's laptop display.
 *
 * Core services are displayed as an icon grid (issue #31) with AWS-branded
 * colour badges and always-visible text labels (issue #32).
 */

import { useState } from "react";
import type { Answer } from "@content/schema/types";
import AwsServiceIcon from "./AwsServiceIcon";
import MermaidDiagram from "./MermaidDiagram";

interface AccordionSectionProps {
  label: string;
  children: React.ReactNode;
}

function AccordionSection({ label, children }: AccordionSectionProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-3 text-left min-h-[44px]
                   focus:outline-none focus:ring-2 focus:ring-aws-orange rounded"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        <span
          className={`text-gray-400 text-sm transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

interface AnswerPanelProps {
  answer: Answer;
}

export default function AnswerPanel({ answer }: AnswerPanelProps) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-green-100 p-5"
      aria-label="Reference answer"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span
          className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-base"
          aria-hidden="true"
        >
          ✓
        </span>
        <h3 className="text-base font-bold text-gray-900">Reference Answer</h3>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-700 leading-relaxed mt-3 mb-2">
        {answer.summary}
      </p>

      {/* Architecture Diagram */}
      {answer.diagram && (
        <AccordionSection label="Architecture Diagram">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <MermaidDiagram chart={answer.diagram} />
          </div>
        </AccordionSection>
      )}

      {/* Core Services — icon grid with text labels (issues #31 & #32) */}
      <AccordionSection label="Core Services">
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))" }}
          aria-label="Core services used in this architecture"
        >
          {answer.coreServices.map((s) => (
            <AwsServiceIcon key={s} name={s} size="md" />
          ))}
        </div>
      </AccordionSection>

      {/* Alternative Approaches */}
      {answer.optionalVariants.length > 0 && (
        <AccordionSection label="Alternative Approaches">
          <div className="space-y-3">
            {answer.optionalVariants.map((v) => (
              <div key={v.title}>
                <p className="text-sm font-semibold text-gray-800">{v.title}</p>
                <p className="text-sm text-gray-600 mt-0.5">{v.description}</p>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* Tradeoffs */}
      <AccordionSection label="Tradeoffs">
        <ul className="space-y-2">
          {answer.tradeoffs.map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="flex-shrink-0 text-amber-500 mt-0.5" aria-hidden="true">
                ⚠
              </span>
              {t}
            </li>
          ))}
        </ul>
      </AccordionSection>

      {/* Resilience */}
      <AccordionSection label="Resilience">
        <p className="text-sm text-gray-700 leading-relaxed">
          {answer.resilienceNotes}
        </p>
      </AccordionSection>

      {/* Security */}
      <AccordionSection label="Security">
        <p className="text-sm text-gray-700 leading-relaxed">
          {answer.securityNotes}
        </p>
      </AccordionSection>

      {/* Why It Fits */}
      <AccordionSection label="Why It Fits">
        <p className="text-sm text-gray-700 leading-relaxed">
          {answer.whyItFits}
        </p>
      </AccordionSection>
    </div>
  );
}
