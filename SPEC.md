# DevDoctor — SPEC

## Product Goal

A CLI tool that analyzes a local repository and reports everything that will prevent it from running — before the user runs a single command.

## V1 Supported Stacks

- **Node.js** — checks `package.json` for missing deps, engine version mismatches, script availability
- **Python** — checks `requirements.txt`, `pyproject.toml`, Python version, virtual env presence
- **Docker Compose** — checks `docker-compose.yml` syntax, image availability, port conflicts
- **.env** — validates `.env.example` vs `.env`, missing required variables
- **Common ports** — detects what's already listening on ports the project needs

## V1 Forbidden

- ❌ GUI or web interface
- ❌ AI / LLM / copilot features
- ❌ Cloud sync, SaaS, or remote API calls
- ❌ Team sync, accounts, payments
- ❌ Plugins, extensions, or custom rules engine
- ❌ Kubernetes support
- ❌ Java, Go, Rust support
- ❌ VSCode extension

## Output Format

Plain text with clear sections:
```
DevDoctor — [path]

Issues found: 3
✓ Environment: .env OK
✗ Dependencies: package.json → express@4.x is missing
✗ Port: 3000 is already in use
✗ Docker: docker-compose.yml → service "db" has no image

Fix:
npm install express
```
