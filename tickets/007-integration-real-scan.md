# Integration Ticket 001 — Real Scan Pipeline

## Goal

Wire the existing 5 modules into a real diagnostic scan pipeline. When a user runs `devdoctor scan`, it should actually detect dependencies, check the environment, inspect ports, and output a human-readable report.

This is DevDoctor's first **MVP moment** — from "scaffold placeholder" to "useful tool."

## Current State

```
devdoctor scan
  → initializeScanner()   [scaffold — no-op]
  → formatScanResult()    [scaffold — 4 lines]
  → console.log           [DevDoctor v0.1 / Scanning... / Scanner initialized.]
```

## Target State

```
devdoctor scan
  → scanRepo()              [Ticket 002 — synchronous]
  → detectDependencies()    [Ticket 003 — synchronous]
  → checkEnvironment()      [Ticket 004 — async]
  → inspectPorts()          [Ticket 005 — async]
  → generateReport()        [Ticket 006 — synchronous]
  → formatReport()          [NEW — CLI formatting]
  → console.log
```

## Scope Boundary

### Allowed

- ✅ Modify `src/cli/program.ts` — replace scan action
- ✅ Modify `src/scanner/index.ts` — replace `initializeScanner` with real pipeline
- ✅ Create `src/report/formatter.ts` — CLI-specific output formatting (colors, exit codes)
- ✅ Add tests for new integration code
- ✅ Add exports from `src/index.ts` as needed

### Forbidden

- ❌ New scanners, detectors, or inspectors
- ❌ New functionality outside "wire existing modules together"
- ❌ auto-fix
- ❌ AI, cloud, telemetry, GUI
- ❌ Install or modify any tools/files on the host
- ❌ Modify tickets/008+

## Files to Modify

| File | Change |
|------|--------|
| `src/scanner/index.ts` | Replace `initializeScanner` with real `runDiagnosticScan()` that calls all 5 modules |
| `src/cli/program.ts` | Replace scan action to call new pipeline and format output |
| `src/report/formatter.ts` | NEW — CLI output formatter (colored, human-readable) |
| `src/scanner/index.test.ts` | Update tests for new pipeline |

## Files NOT to Modify

- `src/scanners/repo.ts` — as-is
- `src/detectors/dependency.ts` — as-is
- `src/detectors/environment.ts` — as-is
- `src/inspectors/ports.ts` — as-is
- `src/report/generator.ts` — as-is, generator is called as a consumer
- `src/report/types.ts` — as-is
- `src/index.ts` — only if needed for new exports
- `tickets/` — only this file (007). tickets/008+ untouched.

## Formal Interface

### New: DiagnosticScanResult

```typescript
// src/scanner/index.ts — new export

import type { ScannerResult } from "../scanners/repo.js";
import type { DependencyResult } from "../detectors/dependency.js";
import type { EnvironmentResult } from "../detectors/environment.js";
import type { PortInspectionResult } from "../inspectors/ports.js";
import type { ReportResult } from "../report/types.js";

export interface DiagnosticScanResult {
  scannerResult: ScannerResult | null;
  dependencyResult: DependencyResult | null;
  environmentResult: EnvironmentResult | null;
  portResult: PortInspectionResult | null;
  report: ReportResult;
  durationMs: number;
  error: string | null;
}

export function runDiagnosticScan(path: string): Promise<DiagnosticScanResult>;
```

### New: ReportFormatter

```typescript
// src/report/formatter.ts

export interface FormatOptions {
  noColor?: boolean;  // respects NO_COLOR env
}

export function formatReport(
  result: ReportResult,
  options?: FormatOptions,
): string;
```

### Pipeline Flow

```
1. resolve path
2. scanRepo(path)        — sync, may return error
3. detectDependencies(path) — sync, may return error
4. checkEnvironment(path)   — async
5. inspectPorts(path)       — async
6. generateReport({scanner, dependency, environment, ports})
7. formatReport(result)
8. console.log output
9. exit with appropriate code
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `scanRepo` error | Set scannerResult to null, add report warning |
| `detectDependencies` error | Set dependencyResult to null, add report warning |
| `checkEnvironment` rejects | Set environmentResult to null, add report warning |
| `inspectPorts` rejects | Set portResult to null, add report warning |
| `generateReport` fails (unlikely) | Catch, show "Report generation failed" message |
| Directory does not exist | Show "Directory not found" before any scan |
| Permission denied | Show "Permission denied" error message |

All individual module errors are caught independently — a crash in one module does not crash the whole scan.

## CLI Output Format

### Normal output

```
DevDoctor v0.1
Scanning repository: /Users/name/project

发现 3 个问题，其中 2 个严重。

严重问题:
  ✗ Node.js 未安装
    这个项目需要 Node.js，但你的电脑没有安装。
    → 安装 Node.js LTS 版本。

建议处理:
  ⚠ 3000 端口已被占用
    开发服务器可能无法启动。
    → 关闭占用 3000 端口的程序。

提示:
  ℹ 检测到 Node + Python 混合项目
```

### Clean output (no issues)

```
DevDoctor v0.1
Scanning repository: /Users/name/project

没有发现明显问题。
```

### Error output (directory not found)

```
DevDoctor v0.1
Error: 目录不存在: /path/to/nonexistent
```

### Color (optional, respects NO_COLOR)

- `✗` / critical → red (ANSI 31)
- `⚠` / warning → yellow (ANSI 33)
- `ℹ` / info → blue (ANSI 34)
- `→` / arrows → dim (ANSI 2)
- Headers like "严重问题:" → bold (ANSI 1)

Wrap all color in `NO_COLOR` check: if `process.env.NO_COLOR` is set, output plain text.

### Exit Codes

| Condition | Code |
|-----------|------|
| No critical issues | 0 |
| Any critical issue | 1 |

Warnings and info issues alone should not trigger exit code 1.

## Output Sections

The formatted output always includes:

1. **Header**: `DevDoctor v{VERSION}\nScanning repository: {path}\n`
2. **Summary**: From `ReportResult.summary`
3. **Issues grouped by severity** (only if non-empty):
   - "严重问题:" section for critical
   - "建议处理:" section for warning
   - "提示:" section for info
4. **Duration**: `扫描用时: {duration}ms` (only if > 0 and issues exist)

Each issue has:
- Severity marker (`✗` / `⚠` / `ℹ`) and title
- Explanation (indented)
- Suggested action with `→` prefix (indented)

## Module Loading Strategy

All 4 detectors run **sequentially** in a single pipeline:

1. `scanRepo` (sync, fast — runs first)
2. `detectDependencies` (sync, fast — runs second)
3. `checkEnvironment` (async — runs third)
4. `inspectPorts` (async — runs fourth)

Sequential is intentional: simple, reliable, debuggable. Performance is not a concern at MVP stage.

## Existing Scaffold Cleanup

- `createDetectorRegistry()` in `src/detectors/index.ts` can remain for backward compatibility
- `initializeScanner()` in `src/scanner/index.ts` should be replaced by `runDiagnosticScan()`
- `formatScanResult()` in `src/report/index.ts` can remain (not imported by new pipeline)
- `src/report/index.ts` re-exports can stay as-is

## Dependencies

None. All modules are built-in. The only external dep is `commander` (already installed).

## Test Requirements

### Acceptance Criteria (10)

1. **Empty directory**: scan an empty dir → outputs "未识别项目结构" and exits 0
2. **Node project**: scan dir with package.json → reports node project info
3. **Python project**: scan dir with pyproject.toml → reports python project info
4. **Docker project**: scan dir with docker-compose.yml → reports docker project info
5. **Missing directory**: scan nonexistent path → graceful error message, exits 1
6. **Permission denied**: scan inaccessible path → graceful error
7. **Malformed files**: scan dir with broken package.json → no crash, warning in report
8. **Exit code 0**: scan clean project → exits 0
9. **Exit code 1**: scan project with critical issue → exits 1
10. **No auto-fix**: scan never modifies any file, never installs tools

## Constraints

- All 5 modules are imported from existing exports (no duplicate logic)
- No new detectors, no new detection logic anywhere
- No calls to exec/spawn/child_process (existing modules handle their own execution)
- No AI, no cloud, no telemetry
- No file modifications
- `NO_COLOR` environment variable respected
- GenerateReport already handles missing inputs — pipe null safely
- Duration tracking at the pipeline level, not per-module
- Tickets 008+ are not touched or planned

## Future

After this ticket:
- Ticket 007 (Test Matrix) expands coverage
- Ticket 008+ (if any) add new features

This integration ticket is the prerequisite for any meaningful testing.
