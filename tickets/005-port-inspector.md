# Ticket 005 — Port Inspector

## Goal
Detect port conflicts that would prevent the project from starting.

## Requirements
- Read `docker-compose.yml` and extract published ports (`ports:` section)
- For Node projects, detect common dev ports (3000, 5173, 8080)
- Check if those ports are already in use on the local machine
- Report the process name and PID using the port, if available
- Skip gracefully if `lsof` / `netstat` are unavailable or if scanning a non-Docker/Node project

## Constraints
- Must not require elevated permissions (use `netstat -an` or `lsof -i` where available)
- Cross-platform: macOS and Linux (Windows optional)
- ⚠️ 非 docker-compose 场景的端口扫描仅为 **heuristic only**（仅扫描常见端口 3000/5173/8080，不做精确保证）

## Acceptance Criteria
- [ ] Detects port 3000 in use from a Docker compose file
- [ ] Reports process name for the occupying process
- [ ] Skips gracefully when no port info is available
- [ ] 非 docker 项目的端口检测标注为 heuristic only
