import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const scannerMock = vi.hoisted(() => ({
  runDiagnosticScan: vi.fn(),
}));

vi.mock("../scanner/index.js", () => scannerMock);

const tempRoots: string[] = [];

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.exitCode = undefined;
  for (const tempRoot of tempRoots.splice(0)) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

describe("createCliProgram", () => {
  it("prints a real diagnostic report for scan", async () => {
    const root = fixture({});
    scannerMock.runDiagnosticScan.mockResolvedValue(scanResult(root));
    const output = await runCli(["node", "devdoctor", "scan", root]);

    expect(output).toContain("DevDoctor v0.1");
    expect(output).toContain(`Scanning repository: ${root}`);
    expect(output).not.toContain("Scanner initialized.");
  });

  it("sets exitCode to 1 when the report has a critical issue", async () => {
    const root = fixture({});
    scannerMock.runDiagnosticScan.mockResolvedValue(
      scanResult(root, {
        issues: [
          {
            severity: "critical",
            title: "Node.js 未安装",
            explanation: "这个项目需要 Node.js，但你的电脑没有安装。",
            suggestedAction: "到 Node.js 官网安装 LTS 版本。",
          },
        ],
      }),
    );

    await runCli(["node", "devdoctor", "scan", root]);

    expect(process.exitCode).toBe(1);
  });

  it("sets exitCode to 0 for warning and info issues", async () => {
    const root = fixture({});
    scannerMock.runDiagnosticScan.mockResolvedValue(
      scanResult(root, {
        issues: [
          {
            severity: "warning",
            title: "3000 端口被占用",
            explanation: "3000 端口已被占用，开发服务器可能无法启动。",
            suggestedAction: "关闭占用该端口的程序。",
          },
          {
            severity: "info",
            title: "混合项目",
            explanation: "检测到 Node + Python 混合项目。",
            suggestedAction: "分别确认每种技术栈需要的工具都已安装。",
          },
        ],
      }),
    );

    await runCli(["node", "devdoctor", "scan", root]);

    expect(process.exitCode).toBe(0);
  });

  it("sets exitCode to 0 when there are no issues", async () => {
    const root = fixture({});
    scannerMock.runDiagnosticScan.mockResolvedValue(scanResult(root));

    await runCli(["node", "devdoctor", "scan", root]);

    expect(process.exitCode).toBe(0);
  });

  it("sets exitCode to 2 for fatal scan failures", async () => {
    const root = fixture({});
    scannerMock.runDiagnosticScan.mockRejectedValue(new Error("boom"));

    const output = await runCli(["node", "devdoctor", "scan", root]);

    expect(process.exitCode).toBe(2);
    expect(output).toContain("扫描失败：boom");
  });

  it("prints help with the scan command", async () => {
    const output = await runCli(["node", "devdoctor", "--help"]);

    expect(output).toContain("Usage: devdoctor [options] [command]");
    expect(output).toContain("scan");
  });

  it("prints version", async () => {
    const output = await runCli(["node", "devdoctor", "--version"]);

    expect(output.trim()).toBe("0.1.0");
  });
});

async function runCli(argv: string[]): Promise<string> {
  const { createCliProgram } = await import("./program.js");
  const program = createCliProgram();
  const writes: string[] = [];

  program.exitOverride();
  program.configureOutput({
    writeOut: (value) => writes.push(value),
    writeErr: (value) => writes.push(value),
  });

  const log = vi.spyOn(console, "log").mockImplementation((value) => {
    writes.push(String(value));
  });
  const errorLog = vi.spyOn(console, "error").mockImplementation((value) => {
    writes.push(String(value));
  });

  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (!isCommanderHelpOrVersionExit(error)) {
      throw error;
    }
  } finally {
    log.mockRestore();
    errorLog.mockRestore();
  }

  return writes.join("");
}

function scanResult(
  rootPath: string,
  report: Partial<Awaited<ReturnType<typeof scannerMock.runDiagnosticScan>>["report"]> = {},
) {
  return {
    rootPath,
    report: {
      summary: "没有发现明显问题。",
      issues: [],
      warnings: [],
      recommendations: [],
      confidence: 1,
      ...report,
    },
  };
}

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "devdoctor-cli-"));
  tempRoots.push(root);

  for (const [fileName, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(root, fileName), contents);
  }

  return root;
}

function isCommanderHelpOrVersionExit(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "commander.helpDisplayed" ||
      error.code === "commander.version")
  );
}
