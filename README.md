# DevDoctor 🩺

<p align="center">
  <strong>Scan any repo. Tell me why it won't run.</strong><br>
  <strong>快速诊断一个项目为什么跑不起来。</strong>
</p>

---

## English

### What is DevDoctor

You clone a repo. You follow the README. You run `npm install`. It fails. Wrong Node version. Missing Python. Docker not installed. Port 3000 in use. Thirty minutes later, you still haven't run the app.

DevDoctor is a CLI tool that scans a local repository and tells you — in one command — everything that will prevent it from running.

### Demo

```
$ npm run dev -- scan ./my-project

DevDoctor v0.1
Scanning repository: ./my-project

Found 2 issues, 2 critical.

Critical:
  ✗ Node.js not installed
    This project requires Node.js, but your machine doesn't have it.
    → Install Node.js LTS.

  ✗ pnpm not installed
    This project uses pnpm, but your machine doesn't have it.
    → Install pnpm and try again.
```

Clean project:

```
DevDoctor v0.1
Scanning repository: ./my-project

No issues found.
✓ Nothing to worry about.
```

### Why

Every developer has been here:

1. Clone a repo
2. Run the setup command
3. Error
4. Spend 20 minutes debugging missing tools, wrong versions, port conflicts
5. Finally get it running — only to realize nothing was actually broken

DevDoctor eliminates step 3–4. It runs in under 2 seconds. No config. No setup.

### Features

- **Repo detection** — automatically identifies Node, Python, Docker, and mixed projects
- **Dependency declaration analysis** — reads package.json, pyproject.toml, docker-compose.yml
- **Environment checks** — detects missing tools (node, pnpm, python, docker, git)
- **Version validation** — catches Node engine version mismatches
- **Port conflict detection** — checks if common ports are free (only reports relevant ones)
- **Human-readable report** — clear diagnosis with suggested actions

### What DevDoctor Does NOT Do

- ❌ Auto-fix — it reports, it doesn't repair
- ❌ Install packages — it tells you what's missing, it doesn't install them
- ❌ AI / LLM — no API calls, no models, no inference
- ❌ Cloud — everything runs locally, no data leaves your machine
- ❌ Telemetry — no tracking, no analytics, no phone home
- ❌ GUI — CLI only, no dashboard

### Quick Start

```bash
git clone https://github.com/thewhitewall520-max/devdoctor.git
cd devdoctor
npm install
npm run dev -- scan <path-to-your-project>
```

> ⚠️ DevDoctor is pre-release. Global npm install is not yet available.

### Current Limitations

DevDoctor is an early MVP. It currently focuses on **Node.js, Python, and Docker** workflows. The output is in Chinese (中文). English output is planned for a future version.

### License

MIT

---

## 中文

### 这是什么

你 clone 了一个项目。按 README 操作。`npm install`。报错。

Node 版本不对。没有 Python。没装 Docker。端口 3000 被占了。折腾半小时，项目还没跑起来。

DevDoctor 是一个本地 CLI 工具。一条命令扫描你的项目，告诉你什么东西会让你跑不起来。

### 演示

```
$ npm run dev -- scan ./my-project

DevDoctor v0.1
Scanning repository: ./my-project

发现 2 个问题，其中 2 个严重。

严重问题:
  ✗ Node.js 未安装
    这个项目需要 Node.js，但你的电脑没有安装。
    → 安装 Node.js LTS 版本。

  ✗ pnpm 未安装
    这个项目使用 pnpm，但你的电脑没有安装它。
    → 安装 pnpm 后再启动项目。
```

干净的项目：

```
DevDoctor v0.1
Scanning repository: ./my-project

未发现需要立即处理的问题。
✓ 没有发现明显问题。
```

### 为什么需要这个

每个开发者都经历过：

1. clone 项目
2. 执行安装命令
3. 报错
4. 花 20 分钟排查：缺工具、版本不对、端口冲突
5. 最后跑起来了——发现其实什么问题都没有

DevDoctor 跳过第 3 步和第 4 步。2 秒扫完。不配配置。不搞设置。

### 当前能力

- **项目识别** — 自动识别 Node、Python、Docker 和混合项目
- **依赖声明分析** — 读取 package.json、pyproject.toml、docker-compose.yml
- **环境检测** — 检查 node、pnpm、python、docker、git 是否安装
- **版本验证** — 检测 Node 引擎版本是否匹配
- **端口冲突检测** — 检查常用端口是否被占用（只报与项目相关的端口）
- **人类可读报告** — 中文诊断，每条问题附带解决建议

### 不做的事

- ❌ 自动修复 — 只报，不修
- ❌ 安装包 — 告诉你缺什么，但不帮你装
- ❌ AI/LLM — 不调 API，不用模型，不做推理
- ❌ 云端 — 全本地运行，数据不出机器
- ❌ 遥测 — 不跟踪，不分析，不发回
- ❌ GUI — 纯 CLI，没有面板

### 快速上手

```bash
git clone https://github.com/thewhitewall520-max/devdoctor.git
cd devdoctor
npm install
npm run dev -- scan <项目路径>
```

> ⚠️ DevDoctor 是预览版本，尚未支持全局 npm 安装。

### 当前局限

DevDoctor 是早期 MVP。当前重点是 **Node.js、Python 和 Docker** 工作流。诊断报告目前为中文。英文版本在后续规划中。

### 许可证

MIT

---

*Clone first. Debug never.* 🩺
