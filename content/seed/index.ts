/**
 * Content seed loader
 *
 * Provides a typed, validated GameContent bundle assembled from the static
 * JSON data files. Designed to be called at application startup or imported
 * directly — no admin authentication required.
 *
 * Usage (Node / Cloudflare Workers with JSON imports enabled):
 *
 *   import { loadGameContent } from "../seed";
 *   const content = loadGameContent();
 *
 * Usage (browser fetch from /content/data/* served as static assets):
 *
 *   import { fetchGameContent } from "../seed";
 *   const content = await fetchGameContent("/content/data");
 */

import type {
  GameContent,
  ChallengeCard,
  ConstraintTag,
  ServiceCatalogue,
  AWSService,
  ServiceCategory,
} from "../schema/types";

import constraintsRaw from "../data/constraints.json";
import challengesRaw from "../data/challenges.json";
import servicesRaw from "../data/services.json";

// ---------------------------------------------------------------------------
// Static loader (module import — works in Cloudflare Workers and Node.js)
// ---------------------------------------------------------------------------

/**
 * Assemble and return the full game content bundle from the bundled JSON files.
 * No network requests, no authentication. Safe to call at module load time.
 */
export function loadGameContent(): GameContent {
  const constraints = constraintsRaw.constraints as ConstraintTag[];
  const challenges = challengesRaw.challenges as ChallengeCard[];
  const serviceCatalogue: ServiceCatalogue = {
    categories: servicesRaw.categories as ServiceCategory[],
    services: servicesRaw.services as AWSService[],
  };

  return { constraints, challenges, serviceCatalogue };
}

// ---------------------------------------------------------------------------
// Fetch-based loader (runtime fetch from static assets — works in browsers
// and Cloudflare Workers that serve JSON files as static assets)
// ---------------------------------------------------------------------------

/**
 * Fetch and assemble the game content bundle from a base URL that serves the
 * content/data directory as static JSON files.
 *
 * @param baseUrl - URL prefix for the data directory, e.g. "/content/data"
 */
export async function fetchGameContent(baseUrl: string): Promise<GameContent> {
  const cleanBase = baseUrl.replace(/\/$/, "");

  const [constraintsRes, challengesRes, servicesRes] = await Promise.all([
    fetch(`${cleanBase}/constraints.json`),
    fetch(`${cleanBase}/challenges.json`),
    fetch(`${cleanBase}/services.json`),
  ]);

  if (!constraintsRes.ok || !challengesRes.ok || !servicesRes.ok) {
    throw new Error(
      `Failed to load game content from ${cleanBase}. ` +
        `HTTP status: constraints=${constraintsRes.status}, ` +
        `challenges=${challengesRes.status}, services=${servicesRes.status}`
    );
  }

  const [constraintsData, challengesData, servicesData] = await Promise.all([
    constraintsRes.json() as Promise<{ constraints: ConstraintTag[] }>,
    challengesRes.json() as Promise<{ challenges: ChallengeCard[] }>,
    servicesRes.json() as Promise<{
      categories: ServiceCategory[];
      services: AWSService[];
    }>,
  ]);

  return {
    constraints: constraintsData.constraints,
    challenges: challengesData.challenges,
    serviceCatalogue: {
      categories: servicesData.categories,
      services: servicesData.services,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Look up a single challenge by its ID. Returns undefined if not found.
 */
export function getChallengeById(
  content: GameContent,
  id: string
): ChallengeCard | undefined {
  return content.challenges.find((c) => c.id === id);
}

/**
 * Return services filtered to a specific category.
 */
export function getServicesByCategory(
  content: GameContent,
  category: ServiceCategory
): AWSService[] {
  return content.serviceCatalogue.services.filter(
    (s) => s.category === category
  );
}

/**
 * Assign challenges from the pool to entries in round-robin order.
 * Returns the challenge ID for the entry at the given zero-based index.
 *
 * @param pool - Ordered list of challenge IDs available for the session
 * @param entryIndex - Zero-based sequential index of the player entry
 */
export function assignChallenge(pool: string[], entryIndex: number): string {
  if (pool.length === 0) {
    throw new Error("Challenge pool is empty — seed content before starting a session");
  }
  return pool[entryIndex % pool.length];
}
