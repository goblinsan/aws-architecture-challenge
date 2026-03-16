# AWS Architecture Challenge

A short-lived, mobile-first TypeScript web app hosted on Cloudflare for a live AWS architecture game.

Players join via QR code, receive a unique entry and assigned use case, review constraints and optional hints, sketch an architecture on paper or whiteboard, and then compare their design to a well-architected reference answer at the end of the round.

## Overview

- **Audience**: AWS builders, internal event participants, facilitator / event host
- **Round length**: ~20 minutes (10 minute design time)
- **Stack**: TypeScript + React + Vite, Tailwind CSS, Cloudflare Workers + KV

## Principles

- Mobile-first, laptop-friendly UX
- Zero required user auth
- Unique player entry per participant or pair
- Quick load over QR code
- Facilitator-friendly reveal flow
- Curated AWS service catalogue by category

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TypeScript + React + Vite |
| Styling | Tailwind CSS |
| Hosting | Cloudflare Workers with static assets |
| Runtime API | Cloudflare Worker routes |
| Storage | Cloudflare KV (short-lived session/entry state) |
| Optional State | Durable Object for live round control |

## Getting Started

> Setup and local dev instructions coming in Phase 1.

## Contributing

See the project board for milestones, epics, and issues.
