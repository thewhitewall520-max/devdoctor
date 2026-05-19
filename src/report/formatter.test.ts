import { describe, expect, it } from "vitest";

import { formatReport } from "./formatter.js";
import type { ReportResult } from "./types.js";

describe("formatReport", () => {
  it("formats grouped CLI output", () => {
    const output = formatReport(
      report({
        issues: [
          issue("warning", "3000 端口被占用"),
          issue("critical", "Node.js 未安装"),
          issue("info", "混合项目"),
        ],
      }),
      { rootPath: "/repo", noColor: true },
    );

    expect(output).toContain("DevDoctor v0.1\nScanning repository: /repo");
    expect(output).toContain("发现 3 个问题，其中 1 个严重。");
    expect(output.indexOf("严重问题:")).toBeLessThan(output.indexOf("建议处理:"));
    expect(output.indexOf("建议处理:")).toBeLessThan(output.indexOf("提示:"));
    expect(output).toContain("✗ Node.js 未安装");
    expect(output).toContain("⚠ 3000 端口已被占用");
    expect(output).toContain("ℹ 混合项目");
  });

  it("prints a clean message with no issues", () => {
    const output = formatReport(report(), { rootPath: "/repo", noColor: true });

    expect(output).toContain("未发现需要立即处理的问题。");
    expect(output).toContain("✓ 没有发现明显问题。");
  });

  it("can color output", () => {
    const output = formatReport(
      report({ issues: [issue("critical", "Node.js 未安装")] }),
      { rootPath: "/repo" },
    );

    expect(output).toContain("\u001b[31m✗ Node.js 未安装\u001b[39m");
  });

  it("respects noColor", () => {
    const output = formatReport(
      report({ issues: [issue("critical", "Node.js 未安装")] }),
      { rootPath: "/repo", noColor: true },
    );

    expect(output).not.toContain("\u001b[");
  });
});

function report(partial: Partial<ReportResult> = {}): ReportResult {
  return {
    summary: "发现 0 个问题。",
    issues: [],
    warnings: [],
    recommendations: [],
    confidence: 1,
    ...partial,
  };
}

function issue(
  severity: "critical" | "warning" | "info",
  title: string,
) {
  return {
    severity,
    title,
    explanation: `${title} explanation`,
    suggestedAction: `${title} action`,
  };
}
