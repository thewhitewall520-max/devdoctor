# Ticket 002 — Repo Scanner

## Goal

Scan a directory and determine what kind of project(s) it contains. Output a structured type + confidence verdict. This is **structural detection only** — no dependency checking, no env parsing.

## What this ticket does NOT do

This ticket is explicitly limited to **file-presence-based project type detection**. It must not:
- ❌ Inspect `package.json` contents (that's Ticket 003)
- ❌ Parse dependency files or version strings (Ticket 003)
- ❌ Check `.env` key presence or diffs (Ticket 004)
- ❌ Scan ports or running services (Ticket 005)
- ❌ Validate Docker compose schema (Ticket 003)
- ❌ Auto-fix, AI, GUI, cloud, or remote calls

## Detection Rules

Scan the root of the given directory for marker files. **Non-recursive** — only the immediate directory is checked. No subdirectory traversal.

| Project Type | Marker Files (ANY → detected) | Notes |
|---|---|---|
| `node` | `package.json` | Just file presence. Do not read contents. |
| `python` | `pyproject.toml` **OR** `requirements.txt` | First match wins. |
| `docker` | `docker-compose.yml` **OR** `docker-compose.yaml` | Do not parse the file. |
| `env` | `.env.example` | Presence only. Do not diff with `.env`. |
| `readme` | `README.md` | Presence only. |

A directory can match multiple types (e.g., `package.json` + `docker-compose.yml` = `mixed`).

## Output Type

```typescript
// src/scanners/repo.ts

export type ProjectType = "node" | "python" | "docker" | "mixed" | "unknown";

export interface DetectedFile {
  path: string;          // Relative path from scan root: "package.json"
  type: ProjectType;     // What kind of project this file suggests
}

export interface ScannerResult {
  projectType: ProjectType;      // Determined type
  detectedFiles: DetectedFile[];  // All matching files found
  path: string;                   // Absolute path that was scanned
  error: string | null;           // Non-null if something went wrong
}
```

### Project Type Resolution Rules

| Marker Files Present | Project Type |
|---|---|
| `package.json` only | `node` |
| `pyproject.toml` or `requirements.txt` only | `python` |
| `package.json` + `pyproject.toml` | `mixed` |
| `docker-compose.yml` + `package.json` | `mixed` |
| No marker files | `unknown` |
| `.env.example` or `README.md` alone (no other markers) | `unknown` (env/readme are supplementary, not primary) |

## Error Handling

| Scenario | Behavior |
|---|---|
| Path does not exist | `ScannerResult.error` = `"ENOENT: directory not found: <path>"` |
| Path is a file, not a directory | `ScannerResult.error` = `"ENOTDIR: path is not a directory: <path>"` |
| No read permission | `ScannerResult.error` = `"EACCES: permission denied: <path>"` |
| Empty directory or no markers | `ScannerResult.projectType = "unknown"`, empty `detectedFiles` |

## Performance

- Max scan time: **< 50ms** for any directory
- Use `fs.readdirSync()` or equivalent — do NOT walk the tree
- Do not use glob patterns or recursive find

## Constraints

- Read-only: never modify files in the scanned repo
- Non-recursive: only the scanned directory root, not subdirectories
- No external dependencies beyond Node.js built-ins (`fs`, `path`)
- The scanner function must be a pure function — same input always produces same output

## Interface Contract

```typescript
// Must export from src/scanners/repo.ts
export function scanRepo(dirPath: string): ScannerResult;
```

The caller (CLI/orchestrator) handles displaying the result. The scanner must not print to stdout/stderr.

## Acceptance Criteria

- [ ] `scanRepo("/nonexistent")` returns `{ error: "ENOENT: ..." }`
- [ ] `scanRepo("tests/fixtures/node-ok/")` returns `{ projectType: "node", detectedFiles: [{ path: "package.json", type: "node" }] }`
- [ ] `scanRepo("tests/fixtures/python-ok/")` returns `{ projectType: "python", detectedFiles: [{ path: "requirements.txt", type: "python" }] }`
- [ ] `scanRepo("tests/fixtures/docker-ok/")` returns `{ projectType: "docker", detectedFiles: [...] }`
- [ ] `scanRepo("tests/fixtures/empty/")` returns `{ projectType: "unknown", detectedFiles: [] }`
- [ ] `scanRepo("tests/fixtures/env-ok/")` reports env file but project type is `unknown` (env alone is not a primary type)
- [ ] `scanRepo("/some-file.txt")` returns `{ error: "ENOTDIR: ..." }`
- [ ] All fixtures exist in `tests/fixtures/` and are not modified by the scanner
- [ ] Scanner runs in < 50ms for any fixture
- [ ] No console.log / stdout output

## Files to create

```
src/scanners/repo.ts          — scanner implementation
src/scanners/repo.test.ts     — tests matching all acceptance criteria
```

Update `src/index.ts` to export `scanRepo`. Do not modify any other ticket files.
