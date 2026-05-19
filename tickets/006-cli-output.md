# Ticket 006 — Report Generator

## Goal

Create a report generator that translates raw detection results (scanner, dependency, environment, port inspector) into a human-readable diagnostic report.

## Scope Boundary

Report Generator **only**:

- Translates raw detection results into human-readable reports
- Aggregates issues from multiple detectors
- Generates severity-ranked recommendations

It does **NOT**:
- Perform any detection or scanning
- Execute any shell commands
- Install or modify any tools/files
- Auto-fix anything
- Call any AI/LLM API
- Show GUI or HTML (V1 is plain text only)
- Modify tickets 007+

## Input

### Function Signature

```typescript
export interface ReportOptions {
  scanner?: ScannerResult;
  dependencies?: DependencyResult;
  environment?: EnvironmentResult;
  ports?: PortInspectionResult;
}

export function generateReport(options: ReportOptions): ReportResult;
```

Each input is optional. The report must handle any combination gracefully — missing detectors produce no related issues, no crash.

### Existing Input Types (from src/ exports)

```typescript
// src/scanners/repo.ts
interface ScannerResult {
  rootPath: string;
  path: string;
  projectType: "node" | "python" | "docker" | "mixed" | "unknown";
  projectTypes: PrimaryProjectType[];
  detectedFiles: DetectedFile[];
  missingOptionalFiles: string[];
  confidence: number;
  warnings: string[];
  error: string | null;
}

// src/detectors/dependency.ts
interface DependencyResult {
  rootPath: string;
  detectedRuntimes: RuntimeInfo[];
  packageManagers: PackageManager[];
  requiredFiles: RequiredFile[];
  warnings: string[];
  confidence: number;
  error: string | null;
}

// src/detectors/environment.ts
interface EnvironmentResult {
  rootPath: string;
  checkedTools: ToolName[];
  installedTools: ToolInfo[];
  missingTools: ToolInfo[];
  versionMismatches: VersionMismatch[];
  warnings: string[];
  confidence: number;
  error: string | null;
}

// src/inspectors/ports.ts
interface PortInspectionResult {
  rootPath: string;
  checkedPorts: PortStatus[];
  occupiedPorts: PortStatus[];
  freePorts: PortStatus[];
  warnings: string[];
  confidence: number;
  error: string | null;
}
```

## Output

### ReportResult

```typescript
export type Severity = "critical" | "warning" | "info";

export interface Issue {
  severity: Severity;
  title: string;
  explanation: string;
  suggestedAction: string;
}

export interface ReportResult {
  summary: string;
  issues: Issue[];
  warnings: string[];
  recommendations: string[];
  confidence: number;
}
```

### Severity Guidelines

| Severity  | When To Use |
|-----------|-------------|
| critical  | Blocking issue — project will not run without fixing this |
| warning   | Non-blocking — can work around, but should address |
| info      | FYI — project structure notes, no action needed |

## Required Diagnostics

Must generate at least these 7 diagnostics from the inputs:

### 1. Missing Node.js
**Trigger**: `EnvironmentResult.missingTools` includes `"node"`
**Output**: `severity: "critical"`

> Title: Node.js 未安装
> Explanation: 项目需要 Node.js，但你的电脑没有安装。
> SuggestedAction: 到 https://nodejs.org 下载安装 Node.js（推荐 LTS 版本）。

### 2. Node version too low
**Trigger**: `EnvironmentResult.versionMismatches` includes tool `"node"` with `installed < required`
**Output**: `severity: "critical"`

> Title: Node.js 版本过低
> Explanation: 项目要求 Node >=20，你当前是 18。
> SuggestedAction: 升级 Node.js：用 `nvm install 20` 或到 https://nodejs.org 下载新版。

### 3. Missing pnpm
**Trigger**: `EnvironmentResult.missingTools` includes `"pnpm"`
**AND** `DependencyResult.packageManagers` includes `"pnpm"`
**Output**: `severity: "critical"`

> Title: pnpm 未安装
> Explanation: 项目使用 pnpm，但你的电脑没有安装。
> SuggestedAction: 运行 `npm install -g pnpm` 安装。

### 4. Docker missing
**Trigger**: `EnvironmentResult.missingTools` includes any of `"docker"`, `"docker compose"`, `"docker-compose"`
**AND** either:
  - `DependencyResult.detectedRuntimes` includes `{ name: "docker" }`
  - OR `ScannerResult.projectTypes` includes `"docker"`
**Output**: `severity: "critical"`

> Title: Docker 未安装
> Explanation: 项目依赖 Docker Compose，但你的电脑没有安装。
> SuggestedAction: 到 https://docker.com 下载安装 Docker Desktop。

### 5. Common port occupied
**Trigger**: `PortInspectionResult.occupiedPorts` is non-empty
**Output**: `severity: "warning"`

Generate **one issue per occupied port**:
> Title: {port} 端口已被占用
> Explanation: <likelyService> 使用的 {port} 端口已被其他程序占用，开发服务器可能无法启动。
> SuggestedAction: 关闭占用 {port} 端口的程序，或修改项目配置使用其他端口。

Example: "PostgreSQL 使用的 5432 端口已被其他程序占用，开发服务器可能无法启动。"

### 6. Unknown project
**Trigger**: `ScannerResult.projectType === "unknown"`
**Output**: `severity: "info"`

> Title: 未识别项目结构
> Explanation: 未检测到 package.json、pyproject.toml、docker-compose.yml 等已知项目标记文件。
> SuggestedAction: 确认目录是否为正确的项目目录。

### 7. Mixed project
**Trigger**: `ScannerResult.projectType === "mixed"` (i.e. `projectTypes.length > 1`)
**Output**: `severity: "info"`

> Title: 检测到混合项目
> Explanation: 检测到 Node + Python 混合项目。
> SuggestedAction: 确保两个环境都已正确配置。

The list of detected stacks should be included in the explanation: "检测到 Node + Python 混合项目。" (use the projectType names from `ScannerResult.projectTypes`)

## Issue Ordering

Issues in the output array must be ordered by severity:

1. critical (most severe first)
2. warning
3. info

Within the same severity, order by: missing tools → version mismatches → occupied ports → project structure notes.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No detectors available (empty inputs) | Empty summary, empty issues |
| Scanner error (`ScannerResult.error` set) | Add as warning: "项目目录扫描失败: <error message>" |
| Dependency error (`DependencyResult.error` set) | Add as warning |
| Environment error (`EnvironmentResult.error` set) | Add as warning |
| Port error (`PortInspectionResult.error` set) | Add as warning |
| Port warnings (timeouts etc.) | Forward as report-level warnings |
| Confidence values | Report keeps lowest confidence among inputs |
| Multiple occupied ports | Generate separate issue per port |
| Mixed project with missing pnpm | Both issues present (mixed info + pnpm critical) |

## Recommendations

In addition to issues, `recommendations` should include:

1. **If no issues found**: "当前项目看起来没有问题，可以正常启动开发。"
2. **If issues exist**: Automatically compile from `Issue.suggestedAction` (deduplicated).

## Summary Format

`summary` should be one concise line:

- No issues: "未发现问题。"
- Issues exist: "发现 N 个问题，其中 M 个严重。"

## Constraints

- Plain text only (no HTML, no JSON in V1)
- Must handle empty report gracefully
- No AI, no LLM calls
- No shell commands
- No file modifications
- Must not import or modify tickets 007+

## Test Coverage

Must test the following scenarios (10 minimum):

1. **Empty inputs**: all detectors absent → empty report, no crash
2. **Missing Node.js**: environment reports node missing → critical issue
3. **Node version mismatch**: environment reports node 18 < required 20 → critical issue
4. **Missing pnpm with project using pnpm**: environment + dependency → critical issue
5. **Docker missing + docker-compose project**: scanner + environment → critical issue
6. **Occupied port**: one port occupied → warning issue
7. **Unknown project**: scanner returns unknown → info issue
8. **Mixed project**: scanner returns mixed → info issue
9. **Multiple issues ordering**: verify severity ordering: critical → warning → info
10. **Graceful missing detectors**: no environment info → skip env-related issues, no crash

## Example Output

### Example 1: Mixed project with issues

```
DevDoctor Report
═══════════════════════════════════════
发现 3 个问题，其中 2 个严重。

严重问题:
  ✗ Node.js 未安装
    项目需要 Node.js，但你的电脑没有安装。
    → 到 https://nodejs.org 下载安装 Node.js（推荐 LTS 版本）。

  ✗ Docker 未安装
    项目依赖 Docker Compose，但你的电脑没有安装。
    → 到 https://docker.com 下载安装 Docker Desktop。

建议处理:
  ⚠ 3000 端口已被占用
    Node.js dev server 使用的 3000 端口已被其他程序占用，开发服务器可能无法启动。
    → 关闭占用 3000 端口的程序，或修改项目配置使用其他端口。

提示:
  ℹ 检测到混合项目
    检测到 Node + Python 混合项目。
    → 确保两个环境都已正确配置。
```

### Example 2: Clean project

```
DevDoctor Report
═══════════════════════════════════════
未发现问题。
```

## File Layout

Create under `src/report/`:

```
src/report/
  index.ts          — current (keep scaffold)
  generator.ts      — generateReport()
  generator.test.ts — tests matching acceptance criteria
  types.ts          — ReportResult, Issue, Severity types
```

Update `src/index.ts` to export `generateReport` and the new types.

## Acceptance Criteria

- [ ] generateReport takes ReportOptions with optional inputs
- [ ] Returns ReportResult with summary, issues, warnings, recommendations
- [ ] 7 required diagnostics all implemented
- [ ] Issue ordering: critical → warning → info
- [ ] All 10 test scenarios pass
- [ ] Empty inputs handled gracefully
- [ ] No shell commands, no AI, no file writes
- [ ] All types exported from src/index.ts
- [ ] CLI output scaffold unaffected
- [ ] Tickets 007+ untouched
