# Ticket 004 — Environment Detector

## Goal
Validate that the project's environment configuration is correct.

## Requirements
- If `.env.example` exists but `.env` does not → warn with copy command
- If both exist → diff keys: report missing keys in `.env`
- Detect `.env` files that contain placeholder values (`your_`, `CHANGE_ME`, empty values)
- ⚠️ V1 不做 `.gitignore` 规则校验（标为 V1.1 候选）

## Constraints
- Do not create or modify `.env` files
- Read-only analysis of key presence and values
- V1 不处理 `.gitignore` 匹配逻辑

## Acceptance Criteria
- [ ] Warns when `.env` doesn't exist but `.env.example` does
- [ ] Reports missing keys: `.env` is missing `DB_HOST` listed in `.env.example`
- [ ] Detects placeholder values (e.g., `API_KEY=your_key_here`)
