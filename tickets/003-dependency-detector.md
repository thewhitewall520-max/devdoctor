# Ticket 003 — Dependency Detector

## Goal
Check that all required dependencies are present and compatible.

## Requirements
- **Node.js**: read `package.json`, verify `dependencies` and `devDependencies` exist in `node_modules/`
- **Python**: read `requirements.txt`, check each package is installed (`pip list` or `import` check)
- Report missing packages
- Report engine version mismatches (Node.js version vs `engines` field)
- Skip if no dependency file found

## Constraints
- Do not run `npm install` or `pip install`
- Read-only analysis

## Acceptance Criteria
- [ ] Detects missing `express` in a Node project
- [ ] Detects missing `flask` in a Python project
- [ ] Reports engine mismatch (e.g., requires Node 20 but running Node 18)
- [ ] Skips gracefully when no dep file exists
