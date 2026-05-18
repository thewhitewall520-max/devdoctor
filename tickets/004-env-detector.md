# Ticket 004 — Environment Detector

## Goal

Check whether the host machine has the tools and runtimes that the project declares it needs. This is **host capability detection** — it runs read-only shell commands (`--version`) to verify what's installed, and compares versions against the project's declared requirements (Ticket 003 output).

## What this ticket does NOT do

This ticket is limited to **read-only host inspection**. It must not:
- ❌ Install any tool or runtime
- ❌ Run `npm install`, `pip install`, or any non-read-only command
- ❌ Modify PATH, shell config, `.env`, or `package.json`
- ❌ Start/stop Docker services or run `docker compose up`
- ❌ Auto-fix anything
- ❌ Scan ports
- ❌ Read sensitive tokens, env vars, or credentials
- ❌ Upload telemetry
- ❌ AI, cloud, GUI
- ❌ Modify Ticket 005, 006, or 007

## Tools to check

The detector has a built-in list of known tools. It checks for the existence and version of each.

| Tool | Check command | Version flag |
|---|---|---|
| `node` | `which node` or `where node` | `node --version` |
| `npm` | `which npm` | `npm --version` |
| `pnpm` | `which pnpm` | `pnpm --version` |
| `yarn` | `which yarn` | `yarn --version` |
| `python` | `which python` | `python --version` |
| `python3` | `which python3` | `python3 --version` |
| `pip` | `which pip` | `pip --version` |
| `pip3` | `which pip3` | `pip3 --version` |
| `docker` | `which docker` | `docker --version` |
| `docker-compose` | `which docker-compose` | `docker-compose --version` |
| `docker compose` | `which docker` + check plugin | `docker compose version` |
| `git` | `which git` | `git --version` |

## How it works

### 1. Tool existence check

For each tool in the checklist:
1. Run `which <tool>` (macOS/Linux) or `where <tool>` (Windows) to find the path
2. If found, run `<tool> --version` to get the version string
3. If not found, mark as `installed: false`
4. All commands must have a **2-second timeout**

### 2. Version comparison (optional)

If a `DependencyResult` from Ticket 003 is provided:
- If project declares `engines.node >=20` but host has `node 18` → version mismatch warning
- If project uses `pnpm` (detected via `pnpm-lock.yaml`) but host has no `pnpm` → missing tool warning
- If project uses `docker` (detected via `docker-compose.yml`) but host has no `docker` → missing tool warning
- If project uses `python` (detected via `pyproject.toml`) but host has no `python` → missing tool warning

If no `DependencyResult` is provided, check all tools and report which are missing as warnings only.

## Output Type

```typescript
// src/environment/env.ts

export interface ToolInfo {
  name: string;              // "node" | "npm" | "pnpm" | "yarn" | "python" | ...
  installed: boolean;
  version: string | null;    // Parsed version, null if not installed
  path: string | null;       // Full path, null if not installed
  source: "host" | "dependency";  // How this tool was discovered
}

export interface VersionMismatch {
  tool: string;               // "node"
  required: string;           // ">=20" (from project declaration)
  installed: string;          // "18.17.0" (from host)
  message: string;            // "Project requires node >=20 but 18.17.0 is installed"
}

export interface EnvironmentResult {
  rootPath: string;
  checkedTools: string[];           // All tools that were checked
  installedTools: ToolInfo[];       // Tools that are available
  missingTools: ToolInfo[];         // Tools that are not available
  versionMismatches: VersionMismatch[];
  warnings: string[];
  error: string | null;
}
```

## Security & Safety

All shell commands MUST:
- Use a **2-second timeout** — if the command takes longer, treat as unavailable
- Capture stderr — never let errors propagate as uncaught exceptions
- Never modify environment or files
- Never run with elevated privileges

If a command fails or times out:
- The tool is marked as `installed: false`
- A warning is added to `warnings[]`
- Execution continues to the next tool
- The program never crashes

## Error Handling

| Scenario | Behavior |
|---|---|
| All tools present and matching | Return empty `missingTools`, empty `versionMismatches` |
| Some tools missing | Return in `missingTools`, add warnings |
| Version mismatch | Return in `versionMismatches` array |
| Command timeout (>2s) | Treat as missing, warning added |
| Platform not supported (e.g., no `which`) | Return `error`, populate what can be detected |
| Permission denied to run command | Treat as missing, warning added |

## Performance

- Max scan time: **< 5 seconds** (sequential per-tool checks)
- Each individual command: **< 2 seconds**
- Use `child_process.execFile` or `exec` with timeout — never `execSync` without timeout

## Interface Contract

```typescript
// Must export from src/environment/env.ts

export interface EnvDetectorOptions {
  dependencyResult?: DependencyResult;  // Optional: from Ticket 003
}

export function checkEnvironment(
  dirPath: string,
  options?: EnvDetectorOptions,
): EnvironmentResult;
```

## Integration note

Ticket 004 is the **first ticket that runs commands on the host machine**. This is a deliberate design choice — it only runs `--version` commands, never install commands. The result can later be combined with Ticket 003 and Ticket 005 for a unified diagnosis, but **Ticket 004 itself does not modify the CLI `scan` output**.

## Dependencies

- Node.js built-in: `child_process`, `os`, `path`
- No external npm dependencies required

## Files to create

```
src/environment/env.ts          — implementation
src/environment/env.test.ts     — tests matching all acceptance criteria
```

Do not modify any other ticket files or the CLI `scan` command.

## Acceptance Criteria

- [ ] `checkEnvironment` with a known-installed tool (e.g., `node`) → `installed: true`, version string
- [ ] `checkEnvironment` against a tool assumed missing → `installed: false`
- [ ] A command that times out (>2s) → tool marked missing, warning added
- [ ] A command that errors (e.g., nonexistent binary) → tool marked missing, program does not crash
- [ ] Version match: project says `node >=18`, host has `node 20` → no mismatch
- [ ] Version mismatch: project says `node >=20`, host has `node 18` → mismatch reported
- [ ] Project uses `pnpm` (from Ticket 003 dep result) but host has no `pnpm` → `missingTools` includes pnpm
- [ ] Project uses Docker but host has no docker → `missingTools` includes docker
- [ ] Project uses Python but host has no python → `missingTools` includes python
- [ ] No `DependencyResult` provided → still checks all tools, returns results without version comparison
- [ ] Tool path includes full binary path (e.g., `/usr/local/bin/node`)
- [ ] No `npm install`, `pip install`, or any install command is ever executed
- [ ] Runs in < 5 seconds
- [ ] Does not crash on any platform (macOS, Linux, Windows)

## Performance Constraints

- Sequential per-tool check: < 5 seconds total
- Each `--version` call: < 2 seconds timeout
- Must not block the event loop
- All tools run in separate child processes (not in-process)
