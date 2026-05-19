import type { RuntimeInfo } from "../detectors/dependency.js";
import type { ToolInfo, VersionMismatch } from "../detectors/environment.js";
import type { PortStatus } from "../inspectors/ports.js";
import type { PrimaryProjectType, ProjectType } from "../scanners/repo.js";
import type { ReportInput, ReportIssue, ReportResult } from "./types.js";

const SEVERITY_RANK: Record<ReportIssue["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function generateReport(input: ReportInput = {}): ReportResult {
  const issues: ReportIssue[] = [];
  const warnings = collectWarnings(input);

  addProjectStructureIssues(input, issues);
  addEnvironmentIssues(input, issues);
  addPortIssues(input, issues);

  const sortedIssues = sortIssues(issues);
  const recommendations = unique(
    sortedIssues.map((issue) => issue.suggestedAction).filter(Boolean),
  );

  return {
    summary: summaryFor(sortedIssues),
    issues: sortedIssues,
    warnings,
    recommendations,
    confidence: confidenceFor(input, sortedIssues, warnings),
  };
}

function addProjectStructureIssues(
  input: ReportInput,
  issues: ReportIssue[],
): void {
  const projectType = input.scanner?.projectType;

  if (projectType === "unknown") {
    issues.push({
      severity: "warning",
      title: "未识别项目结构",
      explanation: "未识别项目结构，无法判断需要什么环境。",
      suggestedAction: "确认项目根目录是否包含 package.json、pyproject.toml 或 docker-compose.yml。",
    });
  }

  if (projectType === "mixed") {
    issues.push({
      severity: "info",
      title: "混合项目",
      explanation: `检测到 ${formatProjectTypes(input.scanner?.projectTypes)} 混合项目。`,
      suggestedAction: "分别确认每种技术栈需要的工具都已安装。",
    });
  }
}

function addEnvironmentIssues(
  input: ReportInput,
  issues: ReportIssue[],
): void {
  const dependency = input.dependency;
  const environment = input.environment;

  if (!environment) {
    return;
  }

  for (const tool of environment.missingTools) {
    const issue = missingToolIssue(tool, dependency?.detectedRuntimes ?? []);
    if (issue) {
      issues.push(issue);
    }
  }

  for (const mismatch of environment.versionMismatches) {
    if (mismatch.tool === "node") {
      issues.push(nodeVersionMismatchIssue(mismatch));
    }
  }
}

function addPortIssues(input: ReportInput, issues: ReportIssue[]): void {
  for (const port of input.ports?.occupiedPorts ?? []) {
    if (!isRelevantPort(port.port, input)) {
      continue;
    }
    issues.push(occupiedPortIssue(port));
  }
}

function isRelevantPort(port: number, input: ReportInput): boolean {
  if (port === 11434) {
    return false;
  }

  const projectTypes = projectContext(input);
  if (projectTypes.length === 0) {
    return false;
  }

  return projectTypes.some((projectType) => {
    if (projectType === "node") {
      return [3000, 3001, 5173, 8000, 8080].includes(port);
    }

    if (projectType === "python") {
      return [8000, 8080].includes(port);
    }

    if (projectType === "docker") {
      return dockerRelevantPorts(input).includes(port);
    }

    return false;
  });
}

function projectContext(input: ReportInput): PrimaryProjectType[] {
  if (input.scanner?.projectType === "unknown") {
    return [];
  }

  if (input.scanner?.projectTypes && input.scanner.projectTypes.length > 0) {
    return input.scanner.projectTypes;
  }

  return uniquePrimaryTypes(
    (input.dependency?.detectedRuntimes ?? []).map((runtime) => runtime.name),
  );
}

function dockerRelevantPorts(input: ReportInput): number[] {
  const ports = new Set<number>();
  const dockerRuntime = input.dependency?.detectedRuntimes.find((runtime) => {
    return runtime.name === "docker";
  });

  for (const serviceName of dockerRuntime?.serviceNames ?? []) {
    const normalized = serviceName.toLowerCase();

    if (["postgres", "postgresql", "db"].includes(normalized)) {
      ports.add(5432);
    }

    if (["mysql", "mariadb"].includes(normalized)) {
      ports.add(3306);
    }

    if (normalized === "redis") {
      ports.add(6379);
    }

    if (["mongo", "mongodb"].includes(normalized)) {
      ports.add(27017);
    }
  }

  return [...ports];
}

function missingToolIssue(
  tool: ToolInfo,
  runtimes: RuntimeInfo[],
): ReportIssue | null {
  if (tool.name === "node") {
    return {
      severity: "critical",
      title: "Node.js 未安装",
      explanation: "这个项目需要 Node.js，但你的电脑没有安装。",
      suggestedAction: "到 Node.js 官网安装 LTS 版本。",
    };
  }

  if (tool.name === "pnpm") {
    return {
      severity: "critical",
      title: "pnpm 未安装",
      explanation: "这个项目使用 pnpm，但你的电脑没有安装它。",
      suggestedAction: "安装 pnpm 后再启动项目。",
    };
  }

  if (tool.name === "docker") {
    return {
      severity: "critical",
      title: "Docker 未安装",
      explanation: "这个项目依赖 Docker Compose，但你的电脑没有安装 Docker。",
      suggestedAction: "安装 Docker Desktop 或 Docker Engine。",
    };
  }

  if (tool.name === "python" && hasRuntime(runtimes, "python")) {
    return {
      severity: "critical",
      title: "Python 未安装",
      explanation: "这个项目需要 Python，但你的电脑没有安装。",
      suggestedAction: "安装项目要求的 Python 版本。",
    };
  }

  return null;
}

function nodeVersionMismatchIssue(mismatch: VersionMismatch): ReportIssue {
  return {
    severity: "critical",
    title: "Node.js 版本过低",
    explanation: `这个项目要求 Node.js ${majorVersion(mismatch.required)} 或更高版本，但你当前是 ${majorVersion(mismatch.installed)}。`,
    suggestedAction: "升级 Node.js 到项目要求的版本。",
  };
}

function occupiedPortIssue(port: PortStatus): ReportIssue {
  return {
    severity: "warning",
    title: `${port.port} 端口被占用`,
    explanation: `${port.port} 端口已被占用，开发服务器可能无法启动。`,
    suggestedAction: "关闭占用该端口的程序，或稍后在项目配置里换一个端口。",
  };
}

function collectWarnings(input: ReportInput): string[] {
  return unique([
    ...(input.scanner?.warnings ?? []),
    ...(input.dependency?.warnings ?? []),
    ...(input.environment?.warnings ?? []),
    ...(input.ports?.warnings ?? []),
  ]);
}

function sortIssues(issues: ReportIssue[]): ReportIssue[] {
  return [...issues].sort((left, right) => {
    return SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
  });
}

function summaryFor(issues: ReportIssue[]): string {
  if (issues.length === 0) {
    return "没有发现明显问题。";
  }

  return `发现 ${issues.length} 个问题。`;
}

function confidenceFor(
  input: ReportInput,
  issues: ReportIssue[],
  warnings: string[],
): number {
  const confidences = [
    input.scanner?.confidence,
    input.dependency?.confidence,
    input.environment?.confidence,
    input.ports?.confidence,
  ].filter((value): value is number => typeof value === "number");

  if (confidences.length === 0) {
    return 0;
  }

  const baseConfidence =
    confidences.reduce((total, value) => total + value, 0) / confidences.length;

  if (issues.some((issue) => issue.severity === "critical")) {
    return Math.min(baseConfidence, 0.5);
  }

  if (issues.length > 0 || warnings.length > 0) {
    return Math.min(baseConfidence, 0.75);
  }

  return baseConfidence;
}

function formatProjectTypes(projectTypes: string[] | undefined): string {
  const labels = (projectTypes ?? []).map(projectTypeLabel);
  return labels.length > 0 ? labels.join(" + ") : "多个技术栈";
}

function projectTypeLabel(projectType: ProjectType | string): string {
  if (projectType === "node") {
    return "Node";
  }

  if (projectType === "python") {
    return "Python";
  }

  if (projectType === "docker") {
    return "Docker";
  }

  return projectType;
}

function majorVersion(version: string): string {
  const match = version.match(/\d+/);
  return match?.[0] ?? version;
}

function hasRuntime(
  runtimes: RuntimeInfo[],
  runtimeName: RuntimeInfo["name"],
): boolean {
  return runtimes.some((runtime) => runtime.name === runtimeName);
}

function uniquePrimaryTypes(values: string[]): PrimaryProjectType[] {
  const primaryTypes: PrimaryProjectType[] = [];

  for (const value of values) {
    if (isPrimaryProjectType(value) && !primaryTypes.includes(value)) {
      primaryTypes.push(value);
    }
  }

  return primaryTypes;
}

function isPrimaryProjectType(value: string): value is PrimaryProjectType {
  return value === "node" || value === "python" || value === "docker";
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
