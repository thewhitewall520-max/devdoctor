# Contributing to DevDoctor

DevDoctor is in active early development.

## Principles

- No GUI, no AI, no cloud — V1 is a pure local CLI
- Each feature is designed as a single-purpose scanner that outputs clear, actionable results
- Tickets live in `/tickets/` — each is Codex-ready and self-contained

## How to Contribute

1. Pick an open ticket from `/tickets/`
2. Read the Goal, Requirements, Constraints, and Acceptance Criteria
3. Implement against the test matrix
4. Open a PR with the ticket ID in the title

## Code Style

- Node.js (TypeScript preferred)
- Tests alongside implementation
- No external runtime dependencies beyond what the scanned repo needs
