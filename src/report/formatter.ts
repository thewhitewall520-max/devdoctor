import { VERSION } from "../utils/version.js";
import type { IssueSeverity, ReportIssue, ReportResult } from "./types.js";

export interface FormatReportOptions {
  rootPath: string;
  noColor?: boolean;
}

type ColorName = "red" | "yellow" | "green" | "cyan";

const COLOR_CODES: Record<ColorName, [string, string]> = {
  red: ["\u001b[31m", "\u001b[39m"],
  yellow: ["\u001b[33m", "\u001b[39m"],
  green: ["\u001b[32m", "\u001b[39m"],
  cyan: ["\u001b[36m", "\u001b[39m"],
};

export function formatReport(
  report: ReportResult,
  options: FormatReportOptions,
): string {
  const color = colorizer(options.noColor === true);
  const lines = [
    `DevDoctor v${minorVersion(VERSION)}`,
    `Scanning repository: ${options.rootPath}`,
    "",
    summaryLine(report),
    "",
  ];

  const critical = issuesBySeverity(report.issues, "critical");
  const warning = issuesBySeverity(report.issues, "warning");
  const info = issuesBySeverity(report.issues, "info");

  if (report.issues.length === 0) {
    lines.push(color("✓ 没有发现明显问题。", "green"));
  } else {
    appendIssueSection(lines, "严重问题:", critical, "✗", "red", color);
    appendIssueSection(lines, "建议处理:", warning, "⚠", "yellow", color);
    appendIssueSection(lines, "提示:", info, "ℹ", "cyan", color);
  }

  if (report.warnings.length > 0) {
    if (lines.at(-1) !== "") {
      lines.push("");
    }
    lines.push("扫描提示:");
    for (const warning of report.warnings) {
      lines.push(color(`⚠ ${warning}`, "yellow"));
    }
  }

  return `${trimTrailingBlankLines(lines).join("\n")}\n`;
}

function appendIssueSection(
  lines: string[],
  heading: string,
  issues: ReportIssue[],
  icon: string,
  colorName: ColorName,
  color: (value: string, colorName: ColorName) => string,
): void {
  if (issues.length === 0) {
    return;
  }

  if (lines.at(-1) !== "") {
    lines.push("");
  }
  lines.push(heading);

  for (const issue of issues) {
    lines.push(color(`${icon} ${titleFor(issue)}`, colorName));
    lines.push(issue.explanation);
    if (issue.suggestedAction) {
      lines.push(`→ ${issue.suggestedAction}`);
    }
  }
}

function titleFor(issue: ReportIssue): string {
  const portMatch = issue.title.match(/^(\d+) 端口被占用$/);
  if (portMatch) {
    return `${portMatch[1]} 端口已被占用`;
  }

  return issue.title;
}

function summaryLine(report: ReportResult): string {
  const criticalCount = report.issues.filter(
    (issue) => issue.severity === "critical",
  ).length;

  if (report.issues.length === 0) {
    return "未发现需要立即处理的问题。";
  }

  if (criticalCount === 0) {
    return `发现 ${report.issues.length} 个问题。`;
  }

  return `发现 ${report.issues.length} 个问题，其中 ${criticalCount} 个严重。`;
}

function issuesBySeverity(
  issues: ReportIssue[],
  severity: IssueSeverity,
): ReportIssue[] {
  return issues.filter((issue) => issue.severity === severity);
}

function colorizer(disabled: boolean) {
  return (value: string, colorName: ColorName): string => {
    if (disabled) {
      return value;
    }

    const [open, close] = COLOR_CODES[colorName];
    return `${open}${value}${close}`;
  };
}

function trimTrailingBlankLines(lines: string[]): string[] {
  const trimmed = [...lines];
  while (trimmed.at(-1) === "") {
    trimmed.pop();
  }
  return trimmed;
}

function minorVersion(version: string): string {
  const [major, minor] = version.split(".");
  return major && minor ? `${major}.${minor}` : version;
}
