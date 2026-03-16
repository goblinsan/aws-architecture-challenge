/**
 * MermaidDiagram
 *
 * Lazy-loads the mermaid library and renders a flowchart SVG from a
 * Mermaid definition string. Uses AWS-themed colours (navy + orange).
 */

import { useEffect, useState } from "react";

let mermaidPromise: Promise<typeof import("mermaid")> | null = null;

function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          primaryColor: "#232F3E",
          primaryTextColor: "#ffffff",
          primaryBorderColor: "#FF9900",
          lineColor: "#FF9900",
          secondaryColor: "#37475A",
          tertiaryColor: "#232F3E",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "14px",
        },
      });
      return m;
    });
  }
  return mermaidPromise;
}

let idCounter = 0;

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export default function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const id = `mmd-${++idCounter}`;

    getMermaid()
      .then((m) => m.default.render(id, chart))
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (error) return null;

  if (!svg) {
    return (
      <div className={`flex items-center justify-center py-8 ${className ?? ""}`}>
        <div className="w-6 h-6 border-2 border-aws-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
