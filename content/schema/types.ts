/**
 * Core TypeScript interfaces for the AWS Architecture Challenge game content.
 *
 * These types are the source of truth for all game data including challenges,
 * constraints, hints, answers, and the AWS service catalogue.
 */

// ---------------------------------------------------------------------------
// Constraint types
// ---------------------------------------------------------------------------

/** Well-known constraint identifiers used to tag challenge cards. */
export type ConstraintId =
  | "high-volume"
  | "pci-compliance"
  | "low-latency"
  | "global-accessibility"
  | "multi-region-resilience"
  | "cost-sensitivity"
  | "near-real-time"
  | "operational-simplicity";

/** A reusable constraint that can be applied to one or more challenge cards. */
export interface ConstraintTag {
  /** Unique identifier, matches `ConstraintId`. */
  id: ConstraintId;
  /** Short human-readable label shown on challenge cards (e.g. "High Volume"). */
  label: string;
  /** One-sentence description shown in the constraint legend or tooltip. */
  description: string;
}

// ---------------------------------------------------------------------------
// Hint types
// ---------------------------------------------------------------------------

/**
 * Hint tier level.
 * - 1: Broad conceptual guidance — available immediately.
 * - 2: Directional guidance referencing AWS patterns — unlocked after ~3 min.
 * - 3: Near-explicit direction referencing specific services — unlocked after ~6 min.
 */
export type HintTier = 1 | 2 | 3;

/** A single progressive hint for a challenge card. */
export interface Hint {
  /** Controls unlock order and display sequence. */
  tier: HintTier;
  /** Hint text shown to the player when they choose to reveal this tier. */
  text: string;
}

// ---------------------------------------------------------------------------
// Answer types
// ---------------------------------------------------------------------------

/** An alternative architectural approach or optional enhancement for a challenge. */
export interface AnswerVariant {
  /** Short title for the variant (e.g. "Relational Alternative"). */
  title: string;
  /** One-sentence description of the variant and when to use it. */
  description: string;
}

/**
 * The well-architected reference answer shown to players after time is called.
 * Structured to support a rich post-round debrief discussion.
 */
export interface Answer {
  /** 2–3 sentence overview of what the recommended architecture does and why. */
  summary: string;
  /** Primary AWS services in the solution (service names only, e.g. "Amazon SQS"). */
  coreServices: string[];
  /** Optional alternative services or enhancements beyond the core solution. */
  optionalVariants: AnswerVariant[];
  /** Key design tradeoffs and what was sacrificed for the chosen approach. */
  tradeoffs: string[];
  /** How the architecture handles failures, degradation, and recovery. */
  resilienceNotes: string;
  /** How the architecture addresses security and compliance requirements. */
  securityNotes: string;
  /** Explicit mapping of why the chosen services satisfy the challenge constraints. */
  whyItFits: string;
  /** Mermaid flowchart definition for the architecture diagram. */
  diagram: string;
}

// ---------------------------------------------------------------------------
// Challenge card types
// ---------------------------------------------------------------------------

/** Difficulty rating used for challenge balancing across a session. */
export type Difficulty = "easy" | "medium" | "hard";

/**
 * A complete challenge card representing one AWS architecture use case.
 * Contains everything needed to run a round: scenario, constraints, hints,
 * and the reference answer for debrief.
 */
export interface ChallengeCard {
  /** Unique slug identifier (e.g. "payments-processing"). */
  id: string;
  /** Display title shown at the top of the challenge card. */
  title: string;
  /**
   * 2–4 sentence business scenario describing the context, requirements,
   * and scale. Must give enough information to design an architecture without
   * revealing the answer.
   */
  scenario: string;
  /** Relative difficulty for facilitator balancing purposes. */
  difficulty: Difficulty;
  /** IDs of the constraints applied to this challenge (min 2, max 4). */
  constraints: ConstraintId[];
  /** Progressive hints in tier order (tiers 1, 2, and 3 required). */
  hints: Hint[];
  /** The reference answer revealed after design time ends. */
  answer: Answer;
}

// ---------------------------------------------------------------------------
// Service catalogue types
// ---------------------------------------------------------------------------

/** Top-level category groupings for the browsable AWS service catalogue. */
export type ServiceCategory =
  | "compute"
  | "storage"
  | "databases"
  | "integration"
  | "security"
  | "networking"
  | "observability"
  | "analytics";

/**
 * A single AWS service entry in the browsable catalogue.
 * Descriptions are intentionally brief and plain-language for mobile viewing.
 */
export interface AWSService {
  /** Unique slug (e.g. "lambda"). */
  id: string;
  /** Official AWS service name (e.g. "AWS Lambda"). */
  name: string;
  /** Category grouping used for catalogue navigation. */
  category: ServiceCategory;
  /** One-sentence plain-language description of what the service does. */
  description: string;
  /** 2–4 bullet-style use cases highlighting when to choose this service. */
  keyUseCases: string[];
}

/** The full browsable AWS service catalogue. */
export interface ServiceCatalogue {
  /** Ordered list of category identifiers for rendering navigation tabs. */
  categories: ServiceCategory[];
  /** All services, filterable by category. */
  services: AWSService[];
}

// ---------------------------------------------------------------------------
// Game session types
// ---------------------------------------------------------------------------

/**
 * Configuration for a single game session, stored at runtime in Cloudflare KV.
 * Controls mode, assignment strategy, and round state.
 */
export interface GameConfig {
  /** Whether players join individually or in pairs. */
  mode: "single" | "pairs";
  /**
   * Strategy for assigning challenges from the pool to new entries.
   * - "round-robin": assigns in index order to spread challenges across the room.
   * - "random": assigns randomly from the pool.
   */
  assignmentStrategy: "round-robin" | "random";
  /** IDs of challenges in the pool for this session, drawn from challenges.json. */
  challengePool: string[];
}

/** A player or pair entry created when someone joins via QR code. */
export interface PlayerEntry {
  /** Unique entry ID generated at join time (e.g. UUID or nanoid). */
  entryId: string;
  /**
   * Player name(s). Single string for solo players; two-element array for pairs.
   */
  names: string | [string, string];
  /** ID of the challenge card assigned to this entry. */
  assignedChallengeId: string;
  /** Which hint tiers have been revealed by this entry (e.g. [1, 2]). */
  revealedHintTiers: HintTier[];
  /** ISO timestamp when the entry was created. */
  joinedAt: string;
  /** Whether the facilitator has revealed the answer for this specific entry. */
  answerVisible?: boolean;
}

/** Current state of a game round, stored in Cloudflare KV or Durable Object. */
export type RoundState = "lobby" | "design_active" | "answer_revealed" | "reset";

// ---------------------------------------------------------------------------
// Aggregate content type
// ---------------------------------------------------------------------------

/**
 * The complete game content bundle loaded at runtime.
 * All fields can be seeded from static JSON files without admin authentication.
 */
export interface GameContent {
  /** Reusable constraint definitions indexed by id. */
  constraints: ConstraintTag[];
  /** All available challenge cards. */
  challenges: ChallengeCard[];
  /** Browsable AWS service catalogue. */
  serviceCatalogue: ServiceCatalogue;
}
