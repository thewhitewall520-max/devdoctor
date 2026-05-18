# DevDoctor — Architecture

## Overview

DevDoctor is a single-binary CLI built in Node.js/TypeScript. It scans a local directory and produces a diagnostic report.

## Component Layout

```
src/
├── cli.ts              — Entry point, argument parsing
├── scanner.ts          — Orchestrates all scanners
├── scanners/
│   ├── repo.ts          — Reads repo structure, detects stack
│   ├── deps.ts          — Node/Python dependency analysis
│   ├── env.ts           — .env validation
│   └── ports.ts         — Port conflict detection
├── reporters/
│   └── cli-text.ts      — Plain text human-readable output
└── utils/
    └── fs.ts            — File system helpers
```

## Scanning Pipeline

1. **Repo Scanner** — Identify project type (Node, Python, Docker, etc.)
2. **Dependency Detector** — Analyze missing deps, version mismatches
3. **Env Detector** — Compare `.env` against `.env.example`
4. **Port Inspector** — Check common ports

Each scanner is independent. The orchestrator runs all and aggregates results.

## Constraints

- No network calls
- No file system writes
- No external service dependencies
