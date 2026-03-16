/**
 * AwsServiceIcon
 *
 * Renders a compact AWS-branded icon badge for a service.
 *
 * - Always shows the service name as visible text next to the badge (issue #32).
 * - The coloured badge uses the official AWS category colour palette (issue #29).
 * - Two size variants: "sm" (catalogue cards) and "md" (answer panel grid).
 *
 * Usage:
 *   <AwsServiceIcon name="Amazon SQS" />               // resolves by name
 *   <AwsServiceIcon serviceId="sqs" name="Amazon SQS" /> // resolves by id
 */

import { getIconById, getIconByName } from "../lib/awsIcons";

interface AwsServiceIconProps {
  /** Official service name (always shown as visible text label). */
  name: string;
  /**
   * Canonical service slug (AWSService.id).
   * When provided, the icon is resolved by ID for exact matching.
   * Falls back to name-based lookup if omitted.
   */
  serviceId?: string;
  /** Display size. Defaults to "sm". */
  size?: "sm" | "md";
}

export default function AwsServiceIcon({
  name,
  serviceId,
  size = "sm",
}: AwsServiceIconProps) {
  const config = serviceId ? getIconById(serviceId) : getIconByName(name);

  const badgeSizeClass =
    size === "md"
      ? "w-10 h-10 text-[10px] rounded-lg"
      : "w-7 h-7 text-[9px] rounded-md";

  const nameSizeClass = size === "md" ? "text-xs" : "text-[11px]";

  return (
    <div className="flex flex-col items-center gap-1.5" title={name}>
      {/* Coloured badge with abbreviation */}
      <span
        className={`${badgeSizeClass} flex-shrink-0 flex items-center justify-center
                    font-bold leading-none select-none`}
        style={{ backgroundColor: config.color, color: config.textColor }}
        aria-hidden="true"
      >
        {config.abbr}
      </span>
      {/* Always-visible text label — never relies on icon alone (issue #32) */}
      <span
        className={`${nameSizeClass} text-gray-700 font-medium text-center leading-tight max-w-[72px] line-clamp-2`}
      >
        {name}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline variant — badge + name on a single row (used in service cards)
// ---------------------------------------------------------------------------

interface AwsServiceIconInlineProps {
  name: string;
  serviceId?: string;
}

export function AwsServiceIconInline({
  name,
  serviceId,
}: AwsServiceIconInlineProps) {
  const config = serviceId ? getIconById(serviceId) : getIconByName(name);

  return (
    <span className="inline-flex items-center gap-1.5 flex-shrink-0" title={name}>
      <span
        className="w-6 h-6 rounded flex items-center justify-center
                   text-[8px] font-bold leading-none select-none flex-shrink-0"
        style={{ backgroundColor: config.color, color: config.textColor }}
        aria-hidden="true"
      >
        {config.abbr}
      </span>
    </span>
  );
}
