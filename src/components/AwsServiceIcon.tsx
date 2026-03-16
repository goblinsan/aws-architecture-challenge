/**
 * AwsServiceIcon
 *
 * Renders an AWS service icon using the official AWS Architecture Icon set.
 * Falls back to a coloured abbreviation badge if no SVG is available.
 *
 * - Always shows the service name as visible text next to the icon (issue #32).
 * - Two size variants: "sm" (catalogue cards) and "md" (answer panel grid).
 */

import { getIconById, getIconByName, SERVICE_ICONS } from "../lib/awsIcons";
import { SERVICE_NAME_TO_ID } from "../lib/awsIcons";

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

function resolveId(name: string, serviceId?: string): string | undefined {
  if (serviceId && SERVICE_ICONS[serviceId]) return serviceId;
  const fromName = SERVICE_NAME_TO_ID[name.toLowerCase()];
  if (fromName && SERVICE_ICONS[fromName]) return fromName;
  return serviceId;
}

export default function AwsServiceIcon({
  name,
  serviceId,
  size = "sm",
}: AwsServiceIconProps) {
  const config = serviceId ? getIconById(serviceId) : getIconByName(name);
  const resolvedId = resolveId(name, serviceId);
  const iconPath = resolvedId ? `/icons/${resolvedId}.svg` : null;

  const badgeSizeClass =
    size === "md"
      ? "w-10 h-10 rounded-lg"
      : "w-7 h-7 rounded-md";

  const nameSizeClass = size === "md" ? "text-xs" : "text-[11px]";

  return (
    <div className="flex flex-col items-center gap-1.5" title={name}>
      {iconPath ? (
        <img
          src={iconPath}
          alt=""
          className={`${badgeSizeClass} flex-shrink-0 object-contain`}
          aria-hidden="true"
        />
      ) : (
        <span
          className={`${badgeSizeClass} flex-shrink-0 flex items-center justify-center
                      font-bold leading-none select-none text-[10px]`}
          style={{ backgroundColor: config.color, color: config.textColor }}
          aria-hidden="true"
        >
          {config.abbr}
        </span>
      )}
      <span
        className={`${nameSizeClass} text-gray-700 font-medium text-center leading-tight max-w-[72px] line-clamp-2`}
      >
        {name}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline variant — icon + name on a single row (used in service cards)
// ---------------------------------------------------------------------------

interface AwsServiceIconInlineProps {
  name: string;
  serviceId?: string;
}

export function AwsServiceIconInline({
  name,
  serviceId,
}: AwsServiceIconInlineProps) {
  const resolvedId = resolveId(name, serviceId);
  const iconPath = resolvedId ? `/icons/${resolvedId}.svg` : null;
  const config = serviceId ? getIconById(serviceId) : getIconByName(name);

  return (
    <span className="inline-flex items-center gap-1.5 flex-shrink-0" title={name}>
      {iconPath ? (
        <img
          src={iconPath}
          alt=""
          className="w-6 h-6 flex-shrink-0 object-contain"
          aria-hidden="true"
        />
      ) : (
        <span
          className="w-6 h-6 rounded flex items-center justify-center
                     text-[8px] font-bold leading-none select-none flex-shrink-0"
          style={{ backgroundColor: config.color, color: config.textColor }}
          aria-hidden="true"
        >
          {config.abbr}
        </span>
      )}
    </span>
  );
}
