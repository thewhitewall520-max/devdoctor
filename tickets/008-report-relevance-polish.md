# Polish 001 — Report Relevance Polish

## Motivation

`devdoctor scan` currently reports **all** occupied common ports unconditionally.

This creates noise:

```
发现 1 个问题。

建议处理:
  11434 端口已被占用
  11434 端口已被占用，开发服务器可能无法启动。
```

If a user has Ollama (11434), PostgreSQL (5432), Redis (6379) running — all of them show up in every scan, even when the project doesn't use any of them.

First impressions matter. The tool should be **quiet unless relevant**.

## Goal

Make port-related issues context-aware. Only show a port issue if the port is likely used by the current project.

## Scope Boundary

- ✅ Only change `src/report/generator.ts` — specifically `addPortIssues()`
- ✅ Only change port issue generation logic
- ❌ Do NOT modify `src/inspectors/ports.ts` — Port Inspector keeps detecting all 10 ports
- ❌ Do NOT add new port detection
- ❌ Do NOT add new file parsing
- ❌ Do NOT introduce AI
- ❌ Do NOT add new features
- ❌ Do NOT modify CLI pipeline (`src/cli/`, `src/scanner/index.ts`)
- ❌ Do NOT modify tickets/009+

## Context Sources

Available from existing modules:

- `ScannerResult.projectType` — `"node"` / `"python"` / `"docker"` / `"mixed"` / `"unknown"`
- `ScannerResult.projectTypes` — array of detected types, e.g. `["node", "python"]`
- `DependencyResult.detectedRuntimes` — runtime info, includes `serviceNames` for docker compose
- `PortInspectionResult.occupiedPorts` — list of occupied ports with `port` and `likelyService`

## Port Relevance Rules

### For unknown project type

→ Show NO port issues at all.

The project structure isn't recognized, so we can't know what ports matter.

### For Node projects (projectTypes includes "node")

Relevant ports: `3000`, `3001`, `5173`, `8000`, `8080`

All other occupied ports are hidden.

### For Python projects (projectTypes includes "python")

Relevant ports: `8000`, `8080`

All other occupied ports are hidden.

### For Docker projects (projectTypes includes "docker")

Check `detectedRuntimes[].serviceNames` for docker-compose service names.

Map service names to relevant ports:

| Service name pattern | Relevant port |
|---------------------|---------------|
| `postgres`, `db`, `database`, `pg` | 5432 |
| `mysql`, `mariadb`, `maria` | 3306 |
| `redis`, `cache`, `session` | 6379 |
| `mongo`, `mongodb` | 27017 |
| any "web" / "app" / "api" service | 8080, 8000 |

If no service names are detected (no docker-compose file was parsed), show NO port issues.

### For mixed projects (projectTypes includes multiple)

Combine rules from each detected type:

- Node + Python → show Node ports + Python ports
- Node + Docker → show Node ports + matching docker service ports
- Python + Docker → show Python ports + matching docker service ports
- All three → combine all above

### Special handling: 11434 (Ollama)

11434 is never shown as a port issue. The port is not relevant to any project structure and only causes noise.

If in future a ticket adds Ollama detection (e.g. scanning for `ollama` in dependencies), that ticket can re-enable this port. For now, it's hidden.

## Implementation Note

The existing `addPortIssues` function currently iterates over ALL occupied ports:

```ts
function addPortIssues(input: ReportInput, issues: ReportIssue[]): void {
  for (const port of input.ports?.occupiedPorts ?? []) {
    issues.push(occupiedPortIssue(port));
  }
}
```

This should be replaced with a context-aware version:

```ts
function addPortIssues(input: ReportInput, issues: ReportIssue[]): void {
  const relevantPorts = relevantOccupiedPorts(input);
  for (const port of relevantPorts) {
    issues.push(occupiedPortIssue(port));
  }
}

function relevantOccupiedPorts(input: ReportInput): PortStatus[] {
  // Filter occupiedPorts based on projectType + serviceNames
}
```

The `relevantOccupiedPorts` function:
1. Reads project type from `input.scanner`
2. For unknown → return []
3. For docker → match by service names
4. For node/python/mixed → match by port lists
5. Never include port 11434

Other helper functions should be kept private (not exported).

## Rules Summary Table

| Project type | Ports shown | Notes |
|-------------|-------------|-------|
| unknown | (none) | Can't know what's relevant |
| node | 3000, 3001, 5173, 8000, 8080 | Dev servers |
| python | 8000, 8080 | Django/FastAPI |
| docker (with service names) | matching service ports | 5432/3306/6379/27017 + 8000/8080 for web services |
| docker (without compose) | (none) | No service info to match against |
| mixed | union of applicable rules | Combine from each detected type |
| any + 11434 occupied | 11434 always hidden | Ollama is never a warning |

## Test Requirements

Must cover (8 minimum):

| # | Scenario | Expectation |
|---|----------|-------------|
| 1 | unknown project + 11434 occupied | No port issues shown |
| 2 | Node project + 3000 occupied | port issue displayed |
| 3 | Node project + 11434 occupied | No port issue shown (11434 always hidden) |
| 4 | Python project + 8000 occupied | port issue displayed |
| 5 | Docker with redis service + 6379 occupied | port issue displayed |
| 6 | Docker with postgres service + 5432 occupied | port issue displayed |
| 7 | Docker without service info + any port occupied | No port issues shown |
| 8 | Mixed project (node + python) + node+python relevant ports occupied | Only relevant ports shown |

## Files to Modify

| File | Change |
|------|--------|
| `src/report/generator.ts` | Replace `addPortIssues` with context-aware version. Add `relevantOccupiedPorts()` function. |
| `src/report/generator.test.ts` | Update/add tests for context-aware port filtering |
| `tickets/008-report-relevance-polish.md` | This file |

## Files NOT to Modify

- `src/inspectors/ports.ts`
- `src/cli/` (any file)
- `src/scanner/` (any file)
- `src/detectors/` (any file)
- `src/report/types.ts`
- `src/report/formatter.ts`
- `src/index.ts`
- `tickets/009+`

## Constraints

- No changes to port detection (keep detecting all 10 ports)
- No new file parsing
- No AI
- No exec/spawn/child_process
- No auto-fix
- No CLI changes
- All existing tests must still pass (generator tests + port tests may need updating)

## Acceptance Criteria

- [ ] `unknown` project shows 0 port issues regardless of occupied ports
- [ ] `node` project shows only port 3000/3001/5173/8000/8080 issues
- [ ] `python` project shows only port 8000/8080 issues
- [ ] `docker` project with compose services matches by service name
- [ ] `docker` project without compose shows 0 port issues
- [ ] port 11434 is never shown
- [ ] `mixed` project combines relevance rules
- [ ] All 8 test scenarios pass
- [ ] All previous tests still pass (no regressions)
