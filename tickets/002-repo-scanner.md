# Ticket 002 — Repo Scanner

## Goal
Scan a directory and identify the project stack(s) present.

## Requirements
- Detect `package.json` → Node.js
- Detect `requirements.txt` or `pyproject.toml` → Python
- Detect `docker-compose.yml` → Docker
- Detect `.env.example` or `.env` → env file present
- Report an error if no recognized stack is found
- Output a summary of detected stacks

## Constraints
- Read-only: never modify files in the scanned repo
- Must handle deeply nested directories (e.g., monorepos)

## Acceptance Criteria
- [ ] Scans `test/fixtures/node-app/` → detects Node.js
- [ ] Scans `test/fixtures/python-app/` → detects Python
- [ ] Scans `test/fixtures/empty/` → reports "no recognized stack"
