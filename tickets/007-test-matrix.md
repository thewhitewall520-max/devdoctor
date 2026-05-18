# Ticket 007 — Test Matrix

## Goal
Create a comprehensive test suite that covers all scanners and edge cases.

## Requirements
- Create `test/fixtures/` with sample repos:
  - `node-ok/` — valid Node project
  - `node-broken/` — missing deps, wrong engine version
  - `python-ok/` — valid Python project
  - `python-broken/` — missing deps, missing virtual env
  - `docker-ok/` — valid Docker compose
  - `docker-broken/` — port conflict in compose
  - `env-ok/` — .env matches .env.example
  - `env-broken/` — missing keys, placeholder values
  - `empty/` — no recognized stack
- Each fixture must be a real (minimal) project, not empty directories
- Test files must be in `tests/` using a test runner (mocha, jest, or vitest)
- Tests must cover all acceptance criteria from tickets 002–006

## Constraints
- Fixtures go in `/tests/fixtures/` (not in source)
- Tests must not modify fixtures (read-only)
- Tests must run offline (no network)

## Acceptance Criteria
- [ ] All fixtures exist with realistic content
- [ ] `npm test` runs the full suite
- [ ] All acceptance criteria from tickets 002–006 are tested
- [ ] Tests are fast (< 2s total)
