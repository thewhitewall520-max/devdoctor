# Ticket 003 — Dependency Detector

## Goal

Read a project's configuration files and report what **dependencies, runtimes, package managers, and scripts** it declares. This is **declared-intent detection** — it reads what the project *says* it needs, without running any install commands or checking what's actually installed on the machine.

## What this ticket does NOT do

This ticket is limited to **static file analysis**. It must not:
- ❌ Run `npm install`, `pip install`, or any package manager
- ❌ Check whether a package/tool is installed on the host machine
- ❌ Check `node_modules/` or Python `site-packages/` for installed packages
- ❌ Execute any shell command (`npm`, `pnpm`, `python`, `docker`, `pip`)
- ❌ Scan ports, parse env vars, or validate Docker compose schema
- ❌ Auto-fix anything
- ❌ Modify the main CLI `scan` command to output real diagnostics (keep scaffold)
- ❌ AI, cloud, GUI
- ❌ Modify Ticket 004, 005, 006, or 007

## Files to read

Only read the content of these files (if they exist in the scanned root):

| File | Stack | What to extract |
|---|---|---|
| `package.json` | Node.js | `scripts`, `engines.node`, lock file hint for package manager |
| `.nvmrc` | Node.js | Node version string |
| `.node-version` | Node.js | Node version string |
| `requirements.txt` | Python | File existence (do not parse individual packages) |
| `pyproject.toml` | Python | PEP 621 project metadata (minimal parse) |
| `runtime.txt` | Python | Python version hint (Heroku-style) |
| `docker-compose.yml` | Docker | Service names (top-level `services:` keys only) |
| `docker-compose.yaml` | Docker | Same as above |

## Detection Logic

### Node.js

1. If `package.json` exists, read it:
   - Detect **package manager** hint:
     - If `package-lock.json` exists → `npm`
     - If `pnpm-lock.yaml` exists → `pnpm`
     - If `yarn.lock` exists → `yarn`
     - If `bun.lockb` exists → `bun`
     - Otherwise → `unknown`
   - Extract `scripts` as `availableScripts` (object keys)
   - Extract `engines.node` as `engineVersion`
2. If `.nvmrc` exists, read the version string
3. If `.node-version` exists, read the version string (fallback)

### Python

1. If `requirements.txt` exists → note it as a required file
2. If `pyproject.toml` exists, attempt minimal parse:
   - Extract `[project]` → `requires-python`, `dependencies`
   - Detect **package manager** hint:
     - If `poetry.lock` exists → `poetry`
     - If `uv.lock` exists → `uv`
     - If `Pipfile` exists → `pipenv`
     - Otherwise → `pip`
3. If `runtime.txt` exists, read python version string

### Docker

1. If `docker-compose.yml` or `docker-compose.yaml` exists, read it:
   - Parse top-level `services:` key, extract service names
   - Do NOT parse `image`, `ports`, `volumes`, `environment`, or any other field
   - Do NOT validate compose schema

## Output Type

```typescript
// src/detectors/dependency.ts

export interface RuntimeInfo {
  name: string;              // "node" | "python" | "docker"
  version?: string;          // Resolved version string, if available
  packageManager?: string;   // "npm" | "pnpm" | "yarn" | "pip" | "poetry" | "uv" | "pipenv" | "unknown"
  engineVersion?: string;    // engines.node value from package.json
  availableScripts?: string[]; // Keys from package.json scripts
  serviceNames?: string[];   // Docker compose service names
}

export interface RequiredFile {
  path: string;              // Relative path: "package.json"
  type: "runtime" | "config" | "lockfile";
  stack: "node" | "python" | "docker";
}

export interface DependencyResult {
  rootPath: string;
  detectedRuntimes: RuntimeInfo[];
  packageManagers: string[];
  requiredFiles: RequiredFile[];
  warnings: string[];
  error: string | null;
}
```

## Error Handling

| Scenario | Behavior |
|---|---|
| Directory does not exist | `error: "ENOENT: ..."` |
| Permission denied | `error: "EACCES: ..."` |
| Malformed `package.json` (invalid JSON) | Add warning, continue scanning other stacks |
| Malformed `pyproject.toml` (invalid TOML) | Add warning, continue scanning other stacks |
| Malformed `docker-compose.yml` (invalid YAML) | Add warning, continue scanning other stacks |
| No recognized dependency files | Return empty `detectedRuntimes`, `warnings: ["No dependency files found"]` |

## Performance

- Max scan time: **< 100ms** for any directory
- Use `JSON.parse`, basic TOML regex extraction (or `smol-toml`), basic YAML key extraction (or `js-yaml`)

## Constraints

- Read-only: never modify files in the scanned repo
- Non-recursive: only the scanned directory root
- Do NOT check if files in `requiredFiles` exist on disk — only report what configuration files declare
- Do NOT run any shell commands
- Must handle malformed files gracefully (never crash)

## Interface Contract

```typescript
// Must export from src/detectors/dependency.ts
export function detectDependencies(dirPath: string): DependencyResult;
```

## Dependencies

The scanner may use lightweight parsing libraries for non-JSON formats:
- `js-yaml` (for docker-compose YAML — `services:` key only)
- `smol-toml` (for pyproject.toml minimal parse)
- Node.js built-in `JSON.parse` for package.json

## Acceptance Criteria

- [ ] `detectDependencies(tests/fixtures/node-ok/)` → detects `node` runtime, package manager hint, scripts
- [ ] `detectDependencies(tests/fixtures/node-broken/)` → still returns same structure (we don't check actual installation)
- [ ] Detects `pnpm` when `pnpm-lock.yaml` present
- [ ] Detects `yarn` when `yarn.lock` present
- [ ] `package.json` with `engines: { node: ">=18" }` → `engineVersion: ">=18"`
- [ ] `.nvmrc` present → version string extracted
- [ ] `.node-version` present → version string extracted
- [ ] `requirements.txt` present → listed as required file
- [ ] `pyproject.toml` present → detects python runtime, package manager hint
- [ ] Poetry project (`pyproject.toml` + `poetry.lock`) → `packageManager: "poetry"`
- [ ] UV project (`pyproject.toml` + `uv.lock`) → `packageManager: "uv"`
- [ ] `docker-compose.yml` present → `serviceNames` extracted
- [ ] Mixed Node + Python project → both runtimes detected
- [ ] Malformed `package.json` → warning, does not crash
- [ ] Empty directory → empty `detectedRuntimes`, error null
- [ ] Does not modify any files
- [ ] Runs in < 100ms
- [ ] No console.log / stdout output

## Files to create

```
src/detectors/dependency.ts          — implementation
src/detectors/dependency.test.ts     — tests
```

Do not modify any other ticket files or the CLI `scan` command.
