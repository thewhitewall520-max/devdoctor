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

## V1 Scope Boundaries

### WHAT'S IN (V1 Whitelist)

- ✅ **Repo scanning** — Detect project type (Node, Python, Docker, env files)
- ✅ **Dependency detection** — Check if deps exist in `node_modules`, parse `requirements.txt` (static only)
- ✅ **Env detection** — Compare `.env` vs `.env.example`, detect placeholders
- ✅ **Port conflict detection** — Check if project ports are in use locally
- ✅ **Docker compose detection** — Read compose files, extract port mappings
- ✅ **Exact fix suggestions** — Print actionable fix commands (do not execute them)
- ✅ **CLI text output** — Plain text with severity grouping, colors (`NO_COLOR` compliant)

### WHAT'S OUT (V1 Blacklist)

- ❌ **GUI** — No web UI, desktop UI, or TUI beyond text in terminal
- ❌ **AI / LLM** — No AI-powered suggestions, copilot, or natural language generation
- ❌ **Cloud** — No API calls, SaaS, remote sync, or telemetry upload
- ❌ **Plugins** — No plugin system, custom rules engine, or extensibility hooks
- ❌ **Remote execution** — No SSH execution, remote repo scanning, or daemon mode
- ❌ **Auto-fix** — Suggest fixes only; never run `npm install`, `pip install`, or modify files
- ❌ **VSCode extension** — No editor integration in V1
- ❌ **Browser extension** — No browser integration
- ❌ **Telemetry** — No usage data collection, analytics, or error reporting
- ❌ **Team features** — No accounts, payments, organizations, or sharing
- ❌ **Kubernetes support** — No K8s manifest scanning
- ❌ **Java, Go, Rust support** — No language runtimes beyond Node, Python, Docker
- ❌ **JSON / HTML output** — V1 output is plain text only

## Constraints

- No network calls
- No file system writes
- No external service dependencies
- No elevated permissions required
- Cross-platform: macOS and Linux (Windows support best-effort)
- Must handle deeply nested directories (e.g., monorepos)

## Architecture Audit Results

Conducted on 2026-05-18 as part of V1 product lock.

### Drift Points Found

| Severity | Location | Issue | Resolution |
|----------|----------|-------|------------|
| 🔴 HIGH | `docs/architecture.md` | Missing explicit V1 WHAT'S IN / WHAT'S OUT boundary section | ✅ Fixed — this section added above |
| 🟡 MEDIUM | Ticket 003 (Dependency Detector) | Python dep check uses `pip list` / `import` subprocess — potential side effects | Constrain to static `site-packages` directory inspection; avoid subprocess calls for dep checking |
| 🟡 MEDIUM | Ticket 007 (Test Matrix) | `python-broken/` fixture includes "missing virtual env" — not a specified V1 feature | Remove or mark as future; only test what's in tickets 002–006 |
| ⚪ LOW | Ticket 005 (Port Inspector) | PID/process name extraction requires platform-specific tooling (`lsof` vs `netstat`) | Document as best-effort; test for graceful fallback |
| ⚪ LOW | Ticket 007 (Test Matrix) | `docker-broken/` port conflict test is non-deterministic (depends on machine state) | Use mock or conditional test that verifies detection logic without real port binding |

### Clean Findings

| Check | Result |
|-------|--------|
| All tickets have Constraints field | ✅ Yes |
| No "future bait" in tickets | ✅ Clean |
| IPC / CLI is purely local and read-only | ✅ Clean |
| Output format is plain text only | ✅ Clean (Ticket 006 enforces `No HTML, no JSON`) |
| No hidden complexity in feature scope | ✅ Acceptable (minor notes above) |
