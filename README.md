# DevDoctor 🩺

**Scan any repo. Tell me exactly why it won't run.**

## Problem Statement

You clone a repo. You follow the README. It doesn't work.

Missing .env. Wrong Node version. A port is taken. No one knows why.

Hours wasted. Every time.

DevDoctor is a CLI that inspects a repository and tells you — concretely, in plain language — what's broken and how to fix it. Before you even run `npm install`.

## V1 Scope

- Local CLI only
- Supports: Node.js, Python, Docker Compose, .env validation, common port conflicts
- Scans repo structure and detects missing deps, misconfigured env files, conflicting services, and version mismatches
- Outputs clear, actionable fix instructions

## Forbidden Scope (V1)

- ❌ GUI or web interface
- ❌ AI / LLM features
- ❌ Cloud sync or SaaS
- ❌ Team / organization features
- ❌ Accounts or payments
- ❌ Plugins or extensions
- ❌ Kubernetes, Java, Go, Rust, VSCode extension support

## Status

**Planning** — Project scaffold in progress.
