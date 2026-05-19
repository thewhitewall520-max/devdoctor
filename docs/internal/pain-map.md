# DevDoctor — Pain Map

## Why this exists

Every developer has cloned a repo, followed the README, and hit an error that took 30 minutes to figure out. Missing `.env`. Wrong Node version. A port conflict. Undocumented dependency. These are not hard problems — they're just invisible until you run the code.

## Pain points (Day 0 research)

| Pain | Frequency | Cost |
|------|-----------|------|
| Missing `.env` or misconfigured env vars | Very high | 5–15 min debug |
| Missing dependencies | High | 2–10 min debug |
| Wrong language runtime version | Medium | 5–20 min debug |
| Port conflicts | Medium | 2–5 min debug |
| Docker service misconfiguration | Medium | 5–30 min debug |
| Missing system dependencies (brew, apt) | Medium | 5–15 min debug |

DevDoctor catches all of these **before** the first run.
