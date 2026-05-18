# Ticket 005 — Port Inspector

## Goal

Check whether the project's commonly-used ports are already occupied on the local machine. This is **local port availability detection** — it tests whether a port is free by attempting to bind to it. It never kills processes, modifies config, or scans beyond common ports.

## What this ticket does NOT do

This ticket is limited to **read-only local port probing**. It must not:
- ❌ Kill any process
- ❌ Modify port numbers in any configuration file
- ❌ Run `lsof -i` then auto-kill
- ❌ Start/stop Docker services
- ❌ Auto-fix anything
- ❌ Scan all ports (65535) — only the known common list
- ❌ Probe external network addresses
- ❌ Upload telemetry
- ❌ AI, cloud, GUI
- ❌ Modify Ticket 006, 007, or the CLI `scan` command

## Ports to check

| Port | Likely Service | Context |
|---|---|---|
| 3000 | Node.js dev server | Express, Next.js, Gatsby |
| 3001 | Node.js alt port | When 3000 is taken |
| 5173 | Vite dev server | Vite / Vitest |
| 8000 | Python dev server | Django, FastAPI |
| 8080 | HTTP alt port | Java, proxy, Docker |
| 5432 | PostgreSQL | Database |
| 3306 | MySQL / MariaDB | Database |
| 6379 | Redis | Cache / session store |
| 27017 | MongoDB | Database |
| 11434 | Ollama | Local LLM |

## Detection method

Use **Node.js `net.createServer().listen()`** to probe each port:

1. Attempt to create a TCP server on `127.0.0.1:<port>`
2. If it binds successfully → port is **free**
3. If it throws `EADDRINUSE` → port is **occupied**
4. If any other error → port status is **unknown** (add warning)
5. Immediately close the server after binding via `server.close()`
6. Set a **500ms timeout** per port probe

**Do NOT use `lsof`, `netstat`, `fuser`, or any system commands.** The `net` module approach is:
- Cross-platform (macOS, Linux, Windows)
- No elevated permissions needed
- No shell execution
- No parsing of system output
- Always available (Node.js built-in)

## Service name mapping

Map known ports to likely service names for human-readable output. This is **heuristic** — it's an educated guess, not a guarantee.

```
3000 → "Node.js dev server"
3001 → "Node.js dev server (alt)"
5173 → "Vite dev server"
8000 → "Python dev server"
8080 → "HTTP alt server"
5432 → "PostgreSQL"
3306 → "MySQL"
6379 → "Redis"
27017 → "MongoDB"
11434 → "Ollama"
```

## Output Type

```typescript
// src/scanners/ports.ts

export interface PortStatus {
  port: number;
  occupied: boolean;
  likelyService: string | null;
  protocol: "tcp";
}

export interface PortInspectorResult {
  rootPath: string;
  checkedPorts: PortStatus[];
  occupiedPorts: PortStatus[];
  freePorts: PortStatus[];
  warnings: string[];
  error: string | null;
}
```

## Error Handling

| Scenario | Behavior |
|---|---|
| Port is free | `occupied: false` |
| Port is in use | `occupied: true` |
| Probe timeout (>500ms) | Add warning, mark as unknown (skip) |
| Unexpected error (`EACCES`, etc.) | Add warning, mark as unknown (skip) |
| All ports free | Return empty `occupiedPorts` |
| No ports scanned (shouldn't happen) | `error` field populated |

## Performance

- Per-port probe: **< 500ms** (timeout)
- 10 ports total: **< 5 seconds sequential**, ideally < 1s parallel
- Use **sequential** probing (simpler, more reliable)
- Do NOT scan beyond the 10 known ports

## Integration note (for later tickets)

Ticket 006 (CLI output) will later combine `PortInspectorResult` with `ScannerResult` (Ticket 002), `DependencyResult` (Ticket 003), and `EnvironmentResult` (Ticket 004) for the unified diagnosis. **Ticket 005 itself does not modify the CLI `scan` output.**

## Constraints

- Read-only: never modify any files or processes
- Localhost only: only probe `127.0.0.1`
- No external network calls
- No system commands (`lsof`, `netstat`, `fuser`)
- Cross-platform: works on macOS, Linux, Windows
- No elevated privileges required
- Must not crash on any error

## Interface Contract

```typescript
// Must export from src/scanners/ports.ts
export function inspectPorts(dirPath: string): Promise<PortInspectorResult>;
```

## Dependencies

- Node.js built-in: `net`
- No external npm dependencies required

## Files to create

```
src/scanners/ports.ts          — implementation
src/scanners/ports.test.ts     — tests matching all acceptance criteria
```

Do not modify any other ticket files or the CLI `scan` command.

## Acceptance Criteria

- [ ] `inspectPorts` on a free port → `occupied: false`
- [ ] `inspectPorts` on an occupied port → `occupied: true`
- [ ] Multiple ports checked simultaneously → multiple correct statuses
- [ ] Unknown port (not in the known list) handled gracefully → skipped
- [ ] Known port mapped to correct `likelyService` (e.g., port 5432 → "PostgreSQL")
- [ ] Probe failure (simulated) → warning added, does not crash
- [ ] Only probes `127.0.0.1`, not external addresses
- [ ] No `lsof`, `netstat`, or system command output in source code
- [ ] No config file modification anywhere in the implementation
- [ ] Does not scan beyond the 10 known ports
