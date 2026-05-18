# Ticket 006 — CLI Output

## Goal
Format all scanner results into a clean, human-readable CLI report.

## Requirements
- Group issues by severity: `✗ Error` / `⚠ Warning` / `✓ OK`
- Show a summary line at the top: `Issues found: 3`
- Each issue shows the file path and line reference when relevant
- Each issue ends with a fix suggestion on the line below
- Color output: red for errors, yellow for warnings, green for OK (respect `NO_COLOR`)
- Exit code: 0 if zero errors, 1 if any errors found

## Constraints
- No HTML, no JSON (V1 is plain text only)
- Must handle empty reports gracefully: `DevDoctor — [path]\n\n✓ No issues found.`

## Acceptance Criteria
- [ ] Output matches the SPEC format
- [ ] Colors work in terminal, disabled with `NO_COLOR`
- [ ] Exit code 0 for clean repo, 1 for issues
