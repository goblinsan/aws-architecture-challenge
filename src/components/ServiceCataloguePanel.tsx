/**
 * ServiceCataloguePanel
 *
 * Browsable AWS service catalogue grouped by category with a live search filter.
 *
 * - Category tabs scroll horizontally on narrow phones.
 * - Searching across all categories replaces the tab view.
 * - Each service card expands inline to show key use cases.
 */

import { useState, useMemo } from "react";
import type {
  ServiceCatalogue,
  ServiceCategory,
  AWSService,
} from "@content/schema/types";
import { CATEGORY_COLORS } from "../lib/awsIcons";
import { AwsServiceIconInline } from "./AwsServiceIcon";

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  compute:       "Compute",
  storage:       "Storage",
  databases:     "Databases",
  integration:   "Integration",
  security:      "Security",
  networking:    "Networking",
  observability: "Observability",
  analytics:     "Analytics",
};

/** Individual expandable service card */
function ServiceCard({ service }: { service: AWSService }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <button
        className="w-full text-left px-4 py-3 min-h-[52px] flex items-center justify-between gap-2
                   focus:outline-none focus:ring-2 focus:ring-aws-orange rounded-2xl"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls={`service-${service.id}-body`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <AwsServiceIconInline serviceId={service.id} name={service.name} />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm text-gray-900 block truncate">
              {service.name}
            </span>
            <span className="text-xs text-gray-500 mt-0.5 block leading-snug line-clamp-1">
              {service.description}
            </span>
          </div>
        </div>
        <span
          className={`flex-shrink-0 text-gray-400 text-sm transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div
          id={`service-${service.id}-body`}
          className="px-4 pb-4 border-t border-gray-50"
        >
          <p className="text-xs text-gray-600 leading-relaxed mt-2 mb-3">
            {service.description}
          </p>
          <ul className="space-y-1.5">
            {service.keyUseCases.map((uc, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <span
                  className="flex-shrink-0 text-aws-orange font-bold mt-px"
                  aria-hidden="true"
                >
                  •
                </span>
                {uc}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface ServiceCataloguePanelProps {
  catalogue: ServiceCatalogue;
}

export default function ServiceCataloguePanel({
  catalogue,
}: ServiceCataloguePanelProps) {
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>(
    catalogue.categories[0]
  );
  const [searchQuery, setSearchQuery] = useState("");

  const isSearching = searchQuery.trim().length > 0;

  const filteredServices: AWSService[] = useMemo(() => {
    if (isSearching) {
      const q = searchQuery.trim().toLowerCase();
      return catalogue.services.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.keyUseCases.some((uc) => uc.toLowerCase().includes(q))
      );
    }
    return catalogue.services.filter((s) => s.category === activeCategory);
  }, [catalogue.services, activeCategory, searchQuery, isSearching]);

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div className="relative">
        <span
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          aria-hidden="true"
        >
          🔍
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search services…"
          className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 text-sm
                     focus:outline-none focus:ring-2 focus:ring-aws-orange"
          aria-label="Search AWS services"
        />
      </div>

      {/* Category tab strip — hidden while searching */}
      {!isSearching && (
        <div
          className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
          style={{ scrollbarWidth: "none" }}
          role="tablist"
          aria-label="Service categories"
        >
          {catalogue.categories.map((cat) => {
            const isActive = activeCategory === cat;
            const catColor = CATEGORY_COLORS[cat] ?? "#232F3E";
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 flex items-center gap-2 min-h-[40px] px-3 py-2
                           rounded-full text-xs font-semibold border transition-colors
                           focus:outline-none focus:ring-2 focus:ring-aws-orange ${
                             isActive
                               ? "text-white border-transparent"
                               : "bg-white text-gray-600 border-gray-200"
                           }`}
                style={isActive ? { backgroundColor: catColor, borderColor: catColor } : {}}
              >
                {/* AWS-coloured category dot — always shown, even on inactive tabs */}
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: isActive ? "rgba(255,255,255,0.7)" : catColor }}
                  aria-hidden="true"
                />
                {/* Text label always visible (issue #32) */}
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>
      )}

      {/* Result count while searching */}
      {isSearching && (
        <p className="text-xs text-gray-400">
          {filteredServices.length} service
          {filteredServices.length !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Service card list */}
      <div
        className="space-y-2"
        role={isSearching ? undefined : "tabpanel"}
        aria-label={
          isSearching
            ? `Search results for "${searchQuery}"`
            : CATEGORY_LABELS[activeCategory]
        }
      >
        {filteredServices.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            No services found.
          </p>
        ) : (
          filteredServices.map((s) => <ServiceCard key={s.id} service={s} />)
        )}
      </div>
    </div>
  );
}
