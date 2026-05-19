<p align="center">
  <strong style="font-size: 3em;">🩺 DevDoctor</strong>
</p>

<h3 align="center">
  The pre-flight checklist for every repo you clone.
</h3>

<p align="center">
  One command reveals everything preventing your project from running —<br>
  before you waste 20 minutes debugging it.
</p>

<br>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#demo">Demo</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#what-it-isnt">What It Isn't</a> •
  <a href="#中文">中文</a>
</p>

<br>

```shell
$ npx devdoctor scan ./nextjs-app
```

```
DevDoctor v0.1 — ./nextjs-app

✖ 3 issues found

  Critical
  ─────────────────────────────────────────────
  ✖ Node.js version mismatch
    Engine requires >=20, you have 18.17.0
    → Upgrade with `nvm install 20` or download from nodejs.org

  ✖ pnpm not installed
    This project uses pnpm — your machine doesn't have it
    → Install with `npm install -g pnpm`

  Warning
  ─────────────────────────────────────────────
  ⚡ Port 3000 is occupied
    Another process is using the default port
    → Kill the process or configure a different port
```

---

## Why

You clone a repo. Follow the README. Run `npm install`. It fails.

Wrong Node version. Docker not installed. Port already in use. A missing system dependency the README forgot to mention.

Thirty minutes later you haven't run a single line of the app. And it was all preventable.

DevDoctor is the **missing contract** between a repo and its next developer. It reads your project's declared requirements, checks them against the host environment, and reports everything that doesn't match — before you hit your first `npm start`.

It takes less than two seconds. Zero configuration. Zero setup.

---

## Features

<div>

### ⚡ Instant diagnostics
```shell
$ devdoctor scan .
```
Two seconds. One command. Everything wrong, ranked by severity.

### 🧠 Context-aware
Only reports issues that are relevant to your project. Node projects won't warn about Python ports. Docker projects check their compose services. Unknown projects stay quiet.

### 📋 Human-readable
```shell
✖ Node.js not installed   →  Install Node.js LTS.
⚠ Port 5432 occupied      →  PostgreSQL already running.
ℹ Mixed project detected  →  Node + Python.
```
Clear diagnosis. Suggested action. No jargon.

### 🔒 Zero trust
```shell
$ devdoctor scan .   # nothing leaves your machine
```
No telemetry. No cloud. No AI. No network calls. The code is the contract.

</div>

---

## Demo

### Missing pnpm + Node

```shell
$ cd ./project-using-pnpm
$ devdoctor scan .

DevDoctor v0.1 — ./project-using-pnpm

✖ 2 issues found — 2 critical

  Critical
  ─────────────────────────────────────────────
  ✖ Node.js not installed
    This project requires Node.js.
    → Install Node.js LTS.

  ✖ pnpm not installed
    This project uses pnpm.
    → Install pnpm and try again.
```

### Mixed project

```shell
$ devdoctor scan ./fullstack-app
```

```
DevDoctor v0.1 — ./fullstack-app

✖ 2 issues found — 1 critical, 1 info

  Critical
  ─────────────────────────────────────────────
  ✖ Python not installed
    This project requires Python.

  Info
  ─────────────────────────────────────────────
  ℹ Mixed project detected
    Node + Python — verify both environments.
```

### Clean project

```shell
$ devdoctor scan ./my-project
```

```
DevDoctor v0.1 — ./my-project

✔ All clear
```

---

## Quick Start

```shell
git clone https://github.com/thewhitewall520-max/devdoctor.git
cd devdoctor
npm install
npm run dev -- scan ../your-project
```

> **Pre-release.** Global `npm install -g devdoctor` is coming soon. For now, run from the repo.

```shell
# Build from source
npm run build

# Run the CLI directly
node dist/cli.js scan ../your-project
```

---

## Supported Stacks

|   | Stack | Detected by | What we check |
|---|-------|-------------|---------------|
| 🟢 | Node.js | `package.json` | Scripts, engines, node/npm/pnpm/yarn |
| 🔵 | Python | `pyproject.toml`, `requirements.txt` | Python, pip availability |
| 🐳 | Docker | `docker-compose.yml` | Service config, docker tools |
| 🔀 | Mixed | Any combination | Combined checks for every stack |

---

## What It Isn't

DevDoctor is a **read-only diagnostic tool**. It tells you what's wrong — it doesn't fix it.

| ❌ Doesn't do | Why |
|--------------|-----|
| Auto-fix | Reports, doesn't repair |
| Install packages | Tells you what's missing |
| AI inference | No models, no API calls |
| Cloud sync | Everything runs locally |
| Telemetry | Zero data leaves your machine |
| GUI | CLI only, no dashboard |

---

## Project Status

**v0.1.0 — Early MVP.** Focused on Node.js, Python, and Docker workflows. Reports in both English and Chinese. More stacks and global install coming in future releases.

---

## License

MIT &mdash; see [LICENSE](LICENSE).

---

<br>

<h2 id="中文" align="center">中文</h2>

<h3 align="center">每一个 clone 的项目，都应该有一个出发前的检查清单。</h3>

<p align="center">
  一条命令告诉你项目为什么跑不起来——<br>
  而不是等你花了 20 分钟排查才发现。
</p>

<br>

```shell
$ devdoctor scan ./nextjs-app
```

```
DevDoctor v0.1 — ./nextjs-app

✖ 发现 3 个问题

  严重
  ─────────────────────────────────────────────
  ✖ Node.js 版本不匹配
    引擎要求 >=20，当前版本 18.17.0
    → 执行 `nvm install 20` 或到 nodejs.org 下载

  ✖ pnpm 未安装
    项目使用 pnpm，当前环境没有
    → 执行 `npm install -g pnpm`

  建议
  ─────────────────────────────────────────────
  ⚡ 3000 端口被占用
    另一个进程正在使用默认端口
    → 关闭该进程或更换端口配置
```

---

### 为什么需要它

你 clone 了一个项目。按 README 操作。`npm install`。报错。

Node 版本不对。没装 Docker。端口被占。缺一个 README 忘记提的系统依赖。

半小时过去了，项目一行代码都没跑起来。这一切本可以预防。

DevDoctor 是 **项目与下一个开发者之间的契约**。它读取项目的声明需求，对照本地环境逐项检查，然后在你的第一次 `npm start` 之前，把所有不匹配的地方告诉你。

两秒完成。零配置。零设置。

---

### 功能

| 能力 | 说明 |
|------|------|
| ⚡ 即时诊断 | 一条命令，两秒出结果 |
| 🧠 上下文感知 | 只报与项目相关的问题——Node 项目不报 Python 端口 |
| 📋 人类可读 | 每条问题附带解决建议，不说黑话 |
| 🔒 零信任 | 无遥测、无云端、无 AI、不出网 |

---

### 快速上手

```shell
git clone https://github.com/thewhitewall520-max/devdoctor.git
cd devdoctor
npm install
npm run dev -- scan ../some-project
```

> **预览版。** `npm install -g devdoctor` 即将到来。目前从源码运行。

---

### 受检技术栈

| 栈 | 检测依据 | 检查项 |
|----|----------|--------|
| 🟢 Node.js | `package.json` | scripts, engines, node/npm/pnpm/yarn |
| 🔵 Python | `pyproject.toml`, `requirements.txt` | Python, pip |
| 🐳 Docker | `docker-compose.yml` | 服务配置, docker 工具 |
| 🔀 混合项目 | 任意组合 | 上述指标的综合检查 |

---

### 不做的事

- ❌ 自动修复 — 只报，不修
- ❌ 安装包 — 告诉你缺什么
- ❌ AI 推理 — 无模型调用
- ❌ 云端 — 全本地运行
- ❌ 遥测 — 数据不出机器
- ❌ GUI — 纯 CLI

---

### 项目状态

**v0.1.0 — 早期 MVP。** 当前聚焦 Node.js、Python 和 Docker。报告支持中英文。更多技术栈和全局安装将在后续版本推出。

---

### 许可证

MIT &mdash; 详见 [LICENSE](LICENSE)。

<br>

---

<p align="center">
  <em>Clone first. Debug never.</em> 🩺
</p>
