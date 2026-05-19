import { describe, expect, it } from "vitest";

import type { DependencyResult } from "../detectors/dependency.js";
import type { EnvironmentResult, ToolInfo } from "../detectors/environment.js";
import type { PortInspectionResult } from "../inspectors/ports.js";
import type { ScannerResult } from "../scanners/repo.js";
import { generateReport } from "./generator.js";

describe("generateReport", () => {
  it("handles empty inputs", () => {
    expect(generateReport()).toEqual({
      summary: "没有发现明显问题。",
      issues: [],
      warnings: [],
      recommendations: [],
      confidence: 0,
    });
  });

  it("reports missing node", () => {
    const report = generateReport({
      dependency: dependency([{ name: "node" }]),
      environment: environment({
        missingTools: [tool("node")],
      }),
    });

    expect(report.issues[0]).toMatchObject({
      severity: "critical",
      title: "Node.js 未安装",
      explanation: "这个项目需要 Node.js，但你的电脑没有安装。",
      suggestedAction: "到 Node.js 官网安装 LTS 版本。",
    });
  });

  it("reports node version mismatch", () => {
    const report = generateReport({
      environment: environment({
        versionMismatches: [
          {
            tool: "node",
            required: ">=20",
            installed: "18.17.0",
            message: "Project requires node >=20 but 18.17.0 is installed",
          },
        ],
      }),
    });

    expect(report.issues[0]).toMatchObject({
      severity: "critical",
      title: "Node.js 版本过低",
      explanation: "这个项目要求 Node.js 20 或更高版本，但你当前是 18。",
    });
  });

  it("reports missing pnpm", () => {
    const report = generateReport({
      dependency: dependency([{ name: "node", packageManager: "pnpm" }]),
      environment: environment({
        missingTools: [tool("pnpm")],
      }),
    });

    expect(report.issues[0]?.explanation).toBe(
      "这个项目使用 pnpm，但你的电脑没有安装它。",
    );
  });

  it("reports missing docker", () => {
    const report = generateReport({
      dependency: dependency([{ name: "docker", serviceNames: ["web"] }]),
      environment: environment({
        missingTools: [tool("docker")],
      }),
    });

    expect(report.issues[0]?.explanation).toBe(
      "这个项目依赖 Docker Compose，但你的电脑没有安装 Docker。",
    );
  });

  it("reports occupied port", () => {
    const report = generateReport({
      ports: ports({
        occupiedPorts: [
          {
            port: 3000,
            occupied: true,
            protocol: "tcp",
            likelyService: "Node.js dev server",
            warning: null,
          },
        ],
      }),
    });

    expect(report.issues[0]).toMatchObject({
      severity: "warning",
      title: "3000 端口被占用",
      explanation: "3000 端口已被占用，开发服务器可能无法启动。",
    });
  });

  it("reports unknown project", () => {
    const report = generateReport({
      scanner: scanner({ projectType: "unknown", projectTypes: [] }),
    });

    expect(report.issues[0]?.explanation).toBe(
      "未识别项目结构，无法判断需要什么环境。",
    );
  });

  it("reports mixed project", () => {
    const report = generateReport({
      scanner: scanner({
        projectType: "mixed",
        projectTypes: ["node", "python"],
      }),
    });

    expect(report.issues[0]).toMatchObject({
      severity: "info",
      explanation: "检测到 Node + Python 混合项目。",
    });
  });

  it("orders multiple issues by severity", () => {
    const report = generateReport({
      scanner: scanner({ projectType: "mixed", projectTypes: ["node", "python"] }),
      environment: environment({
        missingTools: [tool("node")],
      }),
      ports: ports({
        occupiedPorts: [
          {
            port: 3000,
            occupied: true,
            protocol: "tcp",
            likelyService: "Node.js dev server",
            warning: null,
          },
        ],
      }),
    });

    expect(report.issues.map((issue) => issue.severity)).toEqual([
      "critical",
      "warning",
      "info",
    ]);
  });

  it("handles missing detectors gracefully", () => {
    const report = generateReport({
      scanner: scanner({ projectType: "node", projectTypes: ["node"] }),
      dependency: dependency([{ name: "node", packageManager: "npm" }]),
    });

    expect(report.summary).toBe("没有发现明显问题。");
    expect(report.issues).toEqual([]);
  });
});

function scanner(
  partial: Partial<ScannerResult> = {},
): ScannerResult {
  return {
    rootPath: "/repo",
    path: "/repo",
    projectType: "node",
    projectTypes: ["node"],
    detectedFiles: [],
    missingOptionalFiles: [],
    confidence: 1,
    warnings: [],
    error: null,
    ...partial,
  };
}

function dependency(
  detectedRuntimes: DependencyResult["detectedRuntimes"],
): DependencyResult {
  return {
    rootPath: "/repo",
    detectedRuntimes,
    packageManagers: [],
    requiredFiles: [],
    warnings: [],
    confidence: 1,
    error: null,
  };
}

function environment(
  partial: Partial<EnvironmentResult> = {},
): EnvironmentResult {
  return {
    rootPath: "/repo",
    checkedTools: [],
    installedTools: [],
    missingTools: [],
    versionMismatches: [],
    warnings: [],
    confidence: 1,
    error: null,
    ...partial,
  };
}

function ports(partial: Partial<PortInspectionResult> = {}): PortInspectionResult {
  return {
    rootPath: "/repo",
    checkedPorts: [],
    occupiedPorts: [],
    freePorts: [],
    warnings: [],
    confidence: 1,
    error: null,
    ...partial,
  };
}

function tool(name: ToolInfo["name"]): ToolInfo {
  return {
    name,
    installed: false,
    version: null,
    path: null,
    source: "dependency",
  };
}
