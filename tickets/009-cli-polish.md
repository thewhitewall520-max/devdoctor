# Ticket 009 — CLI Polish

## Goal

Fix the blocking UX issues identified during MVP pressure testing before v0.2 release.

## Scope

This is a **polish-only** ticket. No new features, no new detectors, no AI, no GUI.

---

## Required Fix 1: Exit Code Rules

### Current Behavior

`devdoctor scan` always exits with code 0, regardless of issues found.

### Target Behavior

| Condition | exitCode |
|-----------|----------|
| No critical issues | 0 |
| Any critical issue found | 1 |
| Internal fatal scan failure (e.g. cannot read directory) | 2 |

### Implementation

Modify `src/cli/program.ts` scan action:

```ts
.action(async (repositoryPath: string) => {
  const result = await runDiagnosticScan(repositoryPath);
  const output = formatReport(result.report, {
    rootPath: result.rootPath,
    noColor: process.env.NO_COLOR !== undefined,
  });
  console.log(output);

  // Exit code rules
  const hasCritical = result.report.issues.some(
    (issue) => issue.severity === "critical"
  );
  if (hasCritical) {
    process.exitCode = 1;
  }
})
```

Also add exitCode = 2 for cases where the scan itself fails (e.g. `runDiagnosticScan` throws). Currently `runDiagnosticScan` catches individual module errors internally, but if the entire pipeline fails, set exitCode = 2.

### Test Requirements

- [ ] Clean project → exit code 0
- [ ] Critical issue → exit code 1
- [ ] Only warnings/info → exit code 0
- [ ] Fatal scan error → exit code 2

---

## Required Fix 2: Human-readable Environment Errors

### Current Behavior

Environment detector warnings show raw error messages:

```
⚠ pnpm is not available: Command failed: which pnpm
⚠ python is not available: Command failed: which python
╰ docker version check failed: Command failed: docker --version
```

### Target Behavior

Use simple, human-readable messages in Chinese:

| Current | Target |
|---------|--------|
| `{name} is not available: Command failed: which {name}` | `未找到 {name}，请确认已安装。` |
| `{name} version check failed: Command failed: {name} --version` | `已安装 {name}，但无法检查版本。` |
| `{name} is not available: command timed out` | `{name} 检查超时，可能响应较慢。` |

### Implementation

Modify `commandErrorMessage()` in `src/detectors/environment.ts`:

```ts
function commandErrorMessage(error: unknown): string {
  if (isTimeoutError(error)) {
    return "command timed out";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "command failed";
}
```

Should become context-aware. Since the function is called from two contexts ("is not available" and "version check failed"), change the caller to provide human-readable text directly.

Better approach: replace the two `warnings.push()` call sites in `checkTool()` to produce human-readable messages instead of using `commandErrorMessage()`.

Current:

```ts
options.warnings.push(
  `${definition.name} is not available: ${commandErrorMessage(error)}`,
);
```

New:

```ts
options.warnings.push(
  `未找到 ${definition.name}，请确认已安装。`,
);
```

And for version check:

```ts
options.warnings.push(
  `已安装 ${definition.name}，但无法检查版本。`,
);
```

### Test Requirements

- [ ] Missing tool → message says "未找到 {name}" not "Command failed"
- [ ] Version check failure → message says "无法检查版本"
- [ ] Timeout → message says "检查超时"
- [ ] All existing environment detector tests still pass

---

## Optional Fix 3: Warning Deduplication

### Current Behavior

`collectWarnings()` already uses `unique()` to deduplicate exact string matches. This is working correctly.

### If further deduplication is needed

Check if `No recognized project stack found` and `No dependency files found` both appear when the scanner reports "unknown". If so, these two warnings are redundant with the "未识别项目结构" issue. This is a generator-level concern, not a detector issue.

### Test Requirements (if implemented)

- [ ] Unknown project doesn't duplicate same warning
- [ ] Mixed project only shows relevant warnings once

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/cli/program.ts` | Add exit code logic |
| `src/detectors/environment.ts` | Replace `commandErrorMessage` call sites with human-readable messages |
| `src/cli/program.test.ts` | Update tests for exit code |
| `src/detectors/environment.test.ts` | Update tests for new warning messages |

## Files NOT to Modify

- `src/scanners/`
- `src/inspectors/`
- `src/report/` (except tests if needed for new behavior)
- `src/scanner/index.ts`
- `tickets/010+`

## Acceptance Criteria

- [ ] Exit code 0 for clean projects, 1 for critical issues
- [ ] No "Command failed" in any output
- [ ] Missing tool says "未找到 pnpm，请确认已安装。" instead of raw error
- [ ] All tests pass
- [ ] Build succeeds
- [ ] TypeScript check passes
- [ ] `devdoctor scan` on self still works (clean output)
- [ ] `devdoctor scan` on a repo with missing tools shows readable message
