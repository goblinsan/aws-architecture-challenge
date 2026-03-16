# Event Game Loop and Facilitator Workflow

This document describes the full round flow for the AWS Architecture Challenge, including facilitator steps and player experience for both single-player and pairs modes.

---

## Overview

Each round is approximately 20 minutes long with a 10-minute design window. Players join by scanning a QR code, receive a unique challenge card, design an AWS architecture under given constraints, use optional progressive hints, and then participate in a facilitated answer reveal and debrief.

---

## Pre-Round Setup (Facilitator)

1. **Load the event** – Open the facilitator view and confirm the challenge pool is seeded.
2. **Select mode** – Choose **single-player** (one challenge per person) or **pairs** (one challenge per pair of players).
3. **Display the QR code** – Project or share the join link so players can scan and access the app.
4. **Reset state if re-running** – Use the reset action to clear existing entries and re-seed for a new round.

---

## Phase 1 – Player Join (QR Code Entry)

1. Player scans the QR code with their mobile device.
2. The app opens in the browser — no download, no sign-in required.
3. The player enters their name (single-player) or both names (pairs mode).
4. The system assigns a **unique entry ID** and stores it in session.
   - In single-player mode: each person receives one unique challenge card.
   - In pairs mode: each pair of two players shares one unique challenge card.
5. The player is redirected to their personal challenge card view.

> **Assignment logic**: Challenge cards are drawn from the pool in round-robin order by entry sequence number, ensuring variety across the room and no two nearby players sharing the same challenge.

---

## Phase 2 – Challenge Display

1. The player's challenge card is displayed with:
   - **Title** – The use-case name (e.g., "Payments Processing").
   - **Scenario** – A 2–4 sentence description of the business context and requirements.
   - **Constraints** – Labelled tags (e.g., High Volume, PCI Compliance, Low Latency).
2. The **design timer starts** as soon as the player views their challenge card.
3. The service catalogue is accessible via a bottom navigation tab for reference.

---

## Phase 3 – Design Time (10 Minutes)

1. Players sketch or mentally design their AWS architecture on paper or a whiteboard.
2. The app shows a **countdown timer** (10 minutes).
3. Players can browse the **AWS Service Catalogue** within the app (categorised, mobile-friendly) to explore service options.
4. **Hint access**:
   - Hints are unlocked progressively — players choose when to reveal each tier.
   - **Tier 1** (available immediately): Broad conceptual guidance. Steers thinking without revealing services.
   - **Tier 2** (available after 3 minutes): More specific directional guidance referencing AWS patterns.
   - **Tier 3** (available after 6 minutes): Near-explicit direction referencing key service names.
   - Once a hint tier is revealed, it remains visible for the rest of the round.

> **Design principle**: Hints are scoped to help players get unstuck without fully giving away the answer in the first half of the round. Tier 3 should only be used when a player is genuinely stuck.

---

## Phase 4 – Facilitator Reveals Answer

1. The facilitator announces the end of design time.
2. The facilitator triggers the **reveal** from the facilitator view — all player cards transition to the answer view.
3. The answer view displays:
   - **Summary** – What the recommended architecture does and why.
   - **Core Services** – The primary AWS services in the solution.
   - **Optional Variants** – Alternative approaches or add-ons.
   - **Tradeoffs** – Key design decisions and what was sacrificed.
   - **Resilience Notes** – How the architecture handles failures.
   - **Security Notes** – How the architecture addresses security requirements.
   - **Why It Fits** – Explicit mapping of chosen services to the stated constraints.

---

## Phase 5 – Post-Round Discussion

1. The facilitator leads a 5–10 minute discussion covering:
   - What approaches players came up with.
   - How the reference answer compares to player designs.
   - Why certain services were chosen over alternatives.
   - Any interesting variants or edge cases raised by the room.
2. The service catalogue remains accessible for reference during the discussion.

---

## Single-Player vs Pairs Mode

| Behaviour                       | Single-Player                        | Pairs Mode                                        |
|---------------------------------|--------------------------------------|---------------------------------------------------|
| Entry creation                  | One name, one entry per person       | Two names, one shared entry per pair              |
| Challenge assignment            | One unique card per person           | One unique card per pair                          |
| Hint unlocking                  | Individual per entry                 | Shared per pair entry                             |
| Answer reveal                   | All individual cards reveal at once  | All pair cards reveal at once                     |
| Design collaboration            | Solo                                 | Discussed between the two players                 |

---

## Facilitator Controls Summary

| Control                  | Description                                                  |
|--------------------------|--------------------------------------------------------------|
| Display QR Code          | Shows the join link/QR code for players to scan              |
| Start Round              | Locks entries and starts the design timer for all players    |
| Reveal Answers           | Transitions all player views to the answer/debrief screen    |
| Reset and Re-seed        | Clears all entries and resets state for a new round          |
| View Entries             | Shows who has joined and their assigned challenge title       |

---

## State Transitions

```
LOBBY → DESIGN_ACTIVE → ANSWER_REVEALED → RESET
  ↑                                           |
  └───────────────────────────────────────────┘
```

| State              | Player View                        | Facilitator View                          |
|--------------------|------------------------------------|-------------------------------------------|
| `LOBBY`            | Join form                          | QR code + entry list                      |
| `DESIGN_ACTIVE`    | Challenge card + timer + hints     | Timer + entry count + reveal button       |
| `ANSWER_REVEALED`  | Reference answer + debrief         | Full answer + discussion prompts          |
| `RESET`            | Redirected to join form            | QR code + cleared entry list              |
