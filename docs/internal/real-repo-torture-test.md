# DevDoctor MVP — 真实仓库压力测试

测试时间: 2026-05-19 15:26 +08
测试环境: macOS (arm64), Node.js v24.15.0
测试版本: DevDoctor v0.1 (commit ba8d9cf / 5ff4011)

---

## 测试表格

| # | Repo 类型 | 输出摘要 | 崩溃? | 误报? | 漏报? | 像人话? | 值得截图? |
|---|-----------|---------|-------|-------|-------|---------|----------|
| 1 | Next.js | `未发现需要立即处理的问题。` | ❌ 无 | ❌ 无 | 无（本机有 node） | ✅ | ✅ 干净输出做 demo |
| 2 | Vite | `未发现需要立即处理的问题。` | ❌ 无 | ❌ 无 | 无（本机有 node） | ✅ | — |
| 3 | Express | `未发现需要立即处理的问题。` | ❌ 无 | ❌ 无 | 无（本机有 node） | ✅ | — |
| 4 | FastAPI | `Python 未安装` （严重） | ❌ 无 | ❌ 无（macOS 没装 python） | ⚠️ 提示信息含 command failed 原始错误 | ✅ 主报告好，但细节提示需要 polish | ✅ Python 缺失 demo |
| 5 | Django | `Python 未安装` （严重） | ❌ 无 | ❌ 无 | 同 repo 4 | ✅ 同上 | — |
| 6 | Docker Compose | `未发现需要立即处理的问题。` | ❌ 无 | ❌ 无 | ⚠️ 本机有 Docker Desktop 所以没报缺失（正确） | ✅ | — |
| 7 | Node + Python Mixed | `2 个问题，1 个严重` + `混合项目` | ❌ 无 | ❌ 无 | 无 | ✅ | ✅ 混合项目 demo |
| 8 | No README | `未发现需要立即处理的问题。` | ❌ 无 | ❌ 无 | 可选 optional 文件缺失只是在 scanner 中列了 missingOptionalFiles，没有报告给用户 | ⚠️ 缺少 README 应该是个 info | — |
| 9 | Malformed package.json | `未发现需要立即处理的问题。` + `Malformed JSON` 警告 | ❌ **没有崩溃** | ❌ 无 | 无（正确处理了异常） | ✅ | ✅ 容错 demo |
| 10 | 空目录 | `未识别项目结构` | ❌ **没有崩溃** | ❌ 无 | 无 | ✅ | ✅ 空目录 demo |

## 总体统计

| 指标 | 结果 |
|------|------|
| 测试数 | 10 |
| 崩溃 | **0** (0%) ✅ |
| 误报 | **0** ✅ |
| 有价值输出 | **9/10** ✅（repo 6 Docker 没报缺失因为本机有 Docker，输出正确但平淡） |
| 显得很蠢 | **0** |
| 可用于 README demo | **至少 3 个** |

## Top 5 问题 / Polish Items

### 1. ⚠️ Environment Detector 提示信息不够友好（P2）

repo 4 (FastAPI) 和 repo 5 (Django) 的扫描提示中出现了原始异常信息：

```
⚠ python is not available: Command failed: which python
```

这对非技术用户不够友好。应该提醒用户，但措辞应为：
"python 未安装，无法检查版本。"
去掉 `Command failed: which` 这种调试信息。

建议修改处： `src/detectors/environment.ts` 中的 `commandErrorMessage` 输出格式化。

### 2. ⚠️ missingOptionalFiles 未被 Report Generator 利用（P3）

repo 8 的 scanner 检测到了 `README.md` 缺失（`missingOptionalFiles: ["README.md"]`），但这个信息没有被 Report Generator 翻译成 issue 输出。

这是一个可选项（optional file 缺失不算问题），但如果能输出一个 info 级别的提示会更好：
"项目没有 README.md 文件，考虑补充项目说明。"

建议修改处： `src/report/generator.ts` 中的 `addProjectStructureIssues()`。

### 3. 🔷 空目录的 warnings 重复（P3）

repo 10 (空目录) 输出中同时包含：
- "未识别项目结构"（来自 generator）
- "No recognized project stack found" 和 "No dependency files found"（来自 detector 内部 warning）

这两条 warning 本质上重复了。建议在 generator 层级过滤掉冗余 warning。

### 4. 🔷 Docker 项目未检测 Docker 是否安装（P3）

repo 6 (Docker Compose) 没有报 Docker 缺失，因为本机有 Docker Desktop。但这个取决于环境检测器是否能找到 `docker` 命令。当前逻辑正确。

### 5. 🔷 Exit code 仍未实现（P1）

Repo 4 和 5 有 critical issue 但 exit code 仍为 0。CEO 审计时已记录，建议纳入 roadmap。

## 是否 READY FOR DEMO

**YES ✅ — 可以 demo 了。**

### 推荐的 3 个 Demo 场景

#### Demo 1: 空目录（最直观）
```bash
$ devdoctor scan /tmp/new-project
DevDoctor v0.1
Scanning repository: /tmp/new-project

未识别项目结构，无法判断需要什么环境。
→ 确认项目根目录包含 package.json、pyproject.toml 或 docker-compose.yml。
```

#### Demo 2: Python 项目缺失 Python
```bash
$ devdoctor scan /tmp/fastapi-app
DevDoctor v0.1
Scanning repository: /tmp/fastapi-app

发现 1 个问题，其中 1 个严重。

严重问题:
  ✗ Python 未安装
    这个项目需要 Python，但你的电脑没有安装。
    → 安装项目要求的 Python 版本。
```

#### Demo 3: Malformed package.json（容错演示）
```bash
$ devdoctor scan /tmp/broken-app
DevDoctor v0.1
Scanning repository: /tmp/broken-app

未发现需要立即处理的问题。
✓ 没有发现明显问题。
（但会在扫描提示中显示 Malformed JSON）
```

## 下一步建议

1. **高优先级修复**：exit code 规则（P1）
2. **MVP polish**：environment 错误信息人性化（P2）
3. **辅助完善**：missing README 提示（P3）
4. **文档**：截图 + demo 场景写入 README
5. **发布**：v0.2 版本发布

## 结论

10 个 repo 全员通过，零崩溃，零误报（11434 已修复后）。输出自然可读，符合"非技术用户能看懂"标准。**Ready for MVP demo.** 🐉
