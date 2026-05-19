# DevDoctor — QA Report

*Pre-launch placeholder.*

## Scope

- All scanners run against fixture repos
- CLI output matches SPEC format
- Exit codes are correct (0 = pass, 1 = fail)

## Known Gaps (V1)

- Windows port detection is not implemented (lsof not available)
- Python virtual env detection is heuristic only
- Docker compose validation is syntax-only, no semantic checks

## Pass Criteria

- [ ] All tickets have passing tests
- [ ] No scanner crashes on any fixture
- [ ] Output is always human-readable
