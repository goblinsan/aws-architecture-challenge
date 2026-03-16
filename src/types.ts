import type { ChallengeCard, PlayerEntry, RoundState } from "../content/schema/types";

export interface JoinRequest {
  names: string | [string, string];
  mode: "single" | "pairs";
}

export interface JoinResponse {
  entry: PlayerEntry;
  challenge: ChallengeCard;
  roundState: RoundState;
}

export interface HintRevealResponse {
  revealedHintTiers: number[];
}

export interface SessionStateResponse {
  roundState: RoundState;
  entryCount: number;
}
