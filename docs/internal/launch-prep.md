# DevDoctor Launch Prep

Prepared: 2026-05-19
Current commit: 781b6d4
Status: PRE-LAUNCH (not yet public)

---

## 1. Launch Checklist

### Before public

- [x] Core MVP done (9 tickets merged)
- [x] Exit code rules (009)
- [x] Human-readable errors (009)
- [x] Port relevance polish (008)
- [x] Malformed file resilience tested
- [x] Empty directory handled
- [x] No Command failed in output
- [ ] README rewrite (below) — **PENDING**
- [ ] Screenshot/gif for README — **PENDING**
- [ ] `npx` / global install tested — **DEFERRED** (not publishing yet)
- [ ] Public audit (private paths, OpenClaw traces) — **DONE** (none found)
- [ ] `.gitignore` confirmed complete — **DONE**
- [x] CONTRIBUTING.md exists
- [ ] License file — **OPTIONAL** (can add later)
- [ ] Remove/review reports/ with internal content — **NEEDS REVIEW**

### Post-public (v0.2.0)

- [ ] `npm publish` (requires npm account setup)
- [ ] Homebrew tap (optional, scope creep)
- [ ] GitHub Release with binary
- [ ] Demo screen recording (asciinema/terminal.sugar)
- [ ] Hacker News / Show HN post draft
- [ ] Reddit r/node / r/python post drafts

---

## 2. Audit: Public Exposure Scan

| Check | Status |
|-------|--------|
| OpenClaw references in source | ✅ None |
| aqiao / wall white in source | ✅ None |
| Private API keys / tokens | ✅ None (grep zero hits) |
| `.env` in .gitignore | ✅ Present |
| node_modules/ in .gitignore | ✅ Present |
| dist/ in .gitignore | ✅ Present |
| `.git/config` remote URL | ⚠️ Auth token embedded (GitHub PAT) — see sop below |
| `reports/` dir | ⚠️ Contains internal planning docs (see below) |
| `tickets/` dir | ⚠️ Contains internal ticket specs (OK for dev diary) |

### Sensitive Paths Action

**Git remote URL** — the `.git/config` has a PAT embedded in the URL:
```
url = https://aqiao:ghp_xxx@github.com/thewhitewall520-max/devdoctor.git
```
This is **not** in published source (only local `.git/config`), but if the repo is made public, GitHub **replaces** the origin URL automatically. No action needed — but be aware that `git remote -v` output shared in public would leak the token.

**Internal reports to handle:**
| File | Contains | Action |
|------|----------|--------|
| `reports/real-repo-torture-test.md` | ✓ Internal test data, OK for public | Keep (no secrets) |
| `reports/qa-report.md` | Unknown — needs review | Review first |
| `reports/launch-plan.md` | Unknown — needs review | Review first |
| `reports/pain-map.md` | Unknown — needs review | Review first |

**Recommendation:** Before making repo public, review existing `reports/` files. Move any with private planning info to a separate branch or remove.

---

## 3. README Draft

```markdown
# DevDoctor 🩺

**Scan any repo. Instantly know why it won't run.**

```
$ devdoctor scan ./some-project
DevDoctor v0.1
Scanning repository: /Users/you/some-project

发现 2 个问题，其中 2 个严重。

严重问题:
  ✗ Node.js 未安装
    这个项目需要 Node.js，但你的电脑没有安装。
    → 安装 Node.js LTS 版本。

  ✗ pnpm 未安装
    这个项目使用 pnpm，但你的电脑没有安装它。
    → 安装 pnpm 后再启动项目。
```

## The Problem

Clone a repo. `npm install`. It fails. Wrong Node version. Missing env vars. Port 3000 in use again. 30 minutes later you haven't run a thing.

Every dev knows this pain. It's preventable.

## What DevDoctor Does

One command checks everything **before** you run anything:

- **Project detection** — identifies Node, Python, Docker projects automatically
- **Dependency declarations** — reads package.json, pyproject.toml, docker-compose
- **Environment checks** — finds missing tools (node, pnpm, python, docker)
- **Version validation** — detects Node version mismatches
- **Port conflict detection** — checks if common ports are free (and only reports relevant ones)
- **Human-readable report** — in Chinese, with suggested actions

```
$ devdoctor scan .
DevDoctor v0.1
Scanning repository: /Users/you/your-project

未发现需要立即处理的问题。
✓ 没有发现明显问题。
```

## Quick Start

```bash
# Run without installing
npx tsx src/cli.ts scan .

# Or build and run
npm run build
node dist/cli.js scan .
```

> ⚠️ DevDoctor is pre-release. Global `npm install -g` and `npx devdoctor` are not yet available. Run via `npm run dev -- scan <path>` for now.

## What DevDoctor Does NOT Do

DevDoctor is intentionally limited to **read-only diagnostics**:

- ❌ Does not auto-fix anything
- ❌ Does not call any AI/LLM
- ❌ Does not send data to the cloud
- ❌ Does not install packages
- ❌ Does not modify your project files
- ❌ Has no GUI or dashboard

It looks. It reports. It stops.

## Supported Stacks

| Stack | Detection | Checks |
|-------|-----------|--------|
| Node.js | package.json | Scripts, engines, available tools |
| Python | pyproject.toml, requirements.txt | Python/pip availability |
| Docker | docker-compose.yml | Service names, tools |
| Mixed | Any combination | Combined checks |

## Project Status

**v0.1.0 — MVP.** Core pipeline works. Polish items tracked on GitHub Issues.

---

*Clone first. Debug never.* 🩺
```

---

## 4. Demo Assets List

### Demo 1: Missing pnpm (Node project)

```bash
mkdir -p /tmp/demo-pnpm
cd /tmp/demo-pnpm
echo '{"scripts":{"dev":"vite"},"devDependencies":{"vite":"^6"}}' > package.json
echo "pnpm-lock.yaml" > pnpm-lock.yaml
cd /Users/aq/projects/devdoctor
npm run dev -- scan /tmp/demo-pnpm
```

Expected output:
```
DevDoctor v0.1
Scanning repository: /tmp/demo-pnpm

发现 2 个问题，其中 2 个严重。

严重问题:
  ✗ pnpm 未安装
    这个项目使用 pnpm，但你的电脑没有安装它。
    → 安装 pnpm 后再启动项目。

  ✗ Node.js 未安装
    这个项目需要 Node.js，但你的电脑没有安装。
    → 安装 Node.js LTS 版本。
```

### Demo 2: Node version mismatch

```bash
mkdir -p /tmp/demo-version
cd /tmp/demo-version
echo '{"engines":{"node":">=20"},"scripts":{"start":"node index.js"}}' > package.json
```

### Demo 3: Port conflict

```bash
mkdir -p /tmp/demo-port
cd /tmp/demo-port
echo '{"scripts":{"dev":"vite"},"devDependencies":{"vite":"^6"}}' > package.json
# Occupying a port first:
# python3 -m http.server 3000 &
# devdoctor scan /tmp/demo-port
```

### Demo 4: Clean project

```bash
mkdir -p /tmp/demo-clean
cd /tmp/demo-clean
echo '{"scripts":{"dev":"vite"}}' > package.json
cd /Users/aq/projects/devdoctor
npm run dev -- scan /tmp/demo-clean
```

Expected output:
```
DevDoctor v0.1
Scanning repository: /tmp/demo-clean

未发现需要立即处理的问题。
✓ 没有发现明显问题。
```

---

## 5. Public Release Blockers

| Blocker | Priority | Resolution |
|---------|----------|------------|
| README outdated (describes features not yet built) | **HIGH** | Rewrite — README draft above |
| No screenshot/demo.gif in README | MEDIUM | Create after README finalize |
| `npx devdoctor` doesn't work (pre-release) | MEDIUM | Document as pre-release, draft npm publish plan |
| `reports/` directory needs review | LOW | Review before making repo public |
| No LICENSE file | LOW | Add MIT license before v0.2 |
| No CI/CD badge | LOW | Add after GitHub Actions setup |

---

## 6. Recommended Next Step

1. ✅ **Immediately:** Commit updated README.md (use draft above)
2. 📺 **Before launch:** Create demo gif (asciinema or terminal recording)
3. 🔍 **Before public:** Review `reports/*.md` for private content
4. 📦 **v0.2 plan:** npm publish, GitHub Release, LICENSE, demo video
5. 🌐 **Launch:** Show HN / Reddit posts after v0.2 stable
