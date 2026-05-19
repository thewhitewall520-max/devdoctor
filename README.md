# DevDoctor 🩺

**Scan any repo. Instantly know why it won't run.**

```bash
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

---

## The Problem

You clone a repo. You `npm install`. It fails.

Wrong Node version. Missing env vars. Port 3000 in use again. That one system tool the README forgot to mention. Thirty minutes later, you still haven't run the app.

Every dev knows this. It's completely preventable.

## What It Does

One command checks everything **before** you run anything:

- **Project detection** — recognizes Node, Python, Docker projects automatically
- **Dependency declarations** — reads package.json, pyproject.toml, docker-compose.yml
- **Environment checks** — finds missing tools (node, pnpm, python, docker)
- **Version validation** — detects Node version mismatches
- **Port conflict detection** — checks if common ports are free (only reports relevant ones)
- **Human-readable report** — in Chinese, with suggested actions

## Quick Start

```bash
git clone https://github.com/thewhitewall520-max/devdoctor.git
cd devdoctor
npm install
npm run dev -- scan <path-to-your-project>
```

> DevDoctor is pre-release. Global `npm install -g devdoctor` is not yet available. Run via `npm run dev` for now.

## Demo

### Clean project — nothing to report

```
DevDoctor v0.1
Scanning repository: /tmp/my-project

未发现需要立即处理的问题。
✓ 没有发现明显问题。
```

### Node project with missing pnpm

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

### Mixed Node + Python project

```
DevDoctor v0.1
Scanning repository: /tmp/fullstack

发现 2 个问题，其中 1 个严重。

严重问题:
  ✗ Python 未安装
    这个项目需要 Python，但你的电脑没有安装。
    → 安装项目要求的 Python 版本。

提示:
  ℹ 检测到 Node + Python 混合项目
    → 分别确认每种技术栈需要的工具都已安装。
```

### Malformed package.json — no crash

```
DevDoctor v0.1
Scanning repository: /tmp/broken

未发现需要立即处理的问题。
✓ 没有发现明显问题。

扫描提示:
  ⚠ Malformed JSON in package.json
```

## Supported Stacks

| Stack | Detection | Checks |
|-------|-----------|--------|
| Node.js | package.json | Scripts, engines, available tools |
| Python | pyproject.toml, requirements.txt | Python/pip availability |
| Docker | docker-compose.yml | Service names, tools |
| Mixed | Any combination | Combined checks |

## What It Does NOT Do

DevDoctor is intentionally limited to **read-only diagnostics**:

- ❌ Does not auto-fix anything
- ❌ Does not install packages
- ❌ Does not modify project files
- ❌ Does not call any AI/LLM API
- ❌ Does not send data to the cloud
- ❌ Has no GUI or dashboard

It looks. It reports. It stops.

## Project Status

**v0.1.0 — MVP.** Core pipeline works. More polish items tracked internally before v0.2 release.

---

*Clone first. Debug never.* 🩺
