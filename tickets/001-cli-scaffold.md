# Ticket 001 — CLI Scaffold

## Goal
Set up the project structure, TypeScript toolchain, and CLI entry point.

## Requirements
- Initialize `package.json` with TypeScript, ts-node, Node.js types
- Create `src/cli.ts` entry point using `yargs` or `commander`
- Accept `scan <path>` as the initial command
- Print "DevDoctor — [path]" header
- Handle `--help` and `--version`

## Constraints
- Node.js 18+
- TypeScript strict mode
- No AI, no cloud, no GUI

## Acceptance Criteria
- [ ] `npm run dev -- scan .` prints header
- [ ] `npm run build` produces `dist/cli.js`
- [ ] `--help` shows available commands
- [ ] `--version` shows 0.1.0
