# DevDoctor 🩺

**One command. Before anything breaks.**

Scan any repo. Instantly know what's wrong, what's missing, and how to fix it.

---

## The Problem

Every developer knows the feeling.

You clone a repo. You read the README. You run `npm install`. It fails. You chase missing `.env` vars, wrong Node versions, port conflicts, undocumented system deps. Thirty minutes later, you still haven't run the app.

This happens on every project. Every time. And it's completely preventable.

## How DevDoctor Fixes It

**One command that checks everything before you run anything.**

DevDoctor inspects a repo and tells you — in plain language — what's broken, what's missing, and what command to run to fix it. No config files. No setup. Just run it.

```bash
npx devdoctor .
```

```
DevDoctor — ./some-repo

Issues found: 3
✓ Environment:  .env OK
✗ Dependencies: package.json → express@4.x is missing
✗ Port:         3000 is already in use
✗ Docker:       service "db" has no image

Fix:
  npm install express
  docker compose pull db
```

## Quick Install

```bash
npm install -g devdoctor
# or
npx devdoctor .
```

## Supported Checks

- **Node.js** — missing deps, engine version mismatches, invalid scripts
- **Python** — missing requirements, Python version, virtual env status
- **Docker Compose** — syntax errors, missing images, port conflicts
- **.env** — missing or misconfigured environment variables
- **Port conflicts** — what's already listening on ports the project needs
- **System deps** — missing brew/apt packages (coming in V1.1)

## Why This Matters Now

The JavaScript ecosystem alone has 3M+ packages. Every repo is a snowflake of toolchain, runtime, and environment requirements. What worked on the author's machine won't on yours — and the README won't tell you why.

DevDoctor is the **pre-flight checklist** that should have existed from day one.

---

*Clone first. Debug never.* 🩺
