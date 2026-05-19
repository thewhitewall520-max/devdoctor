import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import type { DependencyResult, RuntimeInfo } from "./dependency.js";

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 2_000;

export type ToolName =
  | "node"
  | "npm"
  | "pnpm"
  | "yarn"
  | "python"
  | "python3"
  | "pip"
  | "pip3"
  | "docker"
  | "docker compose"
  | "docker-compose"
  | "git";

export type ToolSource = "host" | "dependency";

export interface ToolInfo {
  name: ToolName;
  installed: boolean;
  version: string | null;
  path: string | null;
  source: ToolSource;
}

export interface VersionMismatch {
  tool: string;
  required: string;
  installed: string;
  message: string;
}

export interface EnvironmentResult {
  rootPath: string;
  checkedTools: ToolName[];
  installedTools: ToolInfo[];
  missingTools: ToolInfo[];
  versionMismatches: VersionMismatch[];
  warnings: string[];
  confidence: number;
  error: string | null;
}

export interface EnvDetectorOptions {
  dependencyResult?: DependencyResult;
  commandRunner?: CommandRunner;
  timeoutMs?: number;
  platform?: NodeJS.Platform;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export type CommandRunner = (
  command: string,
  args: string[],
  options: { timeoutMs: number },
) => Promise<CommandResult>;

interface ToolDefinition {
  name: ToolName;
  resolveCommand: string;
  resolveArgs: string[];
  versionCommand: string;
  versionArgs: string[];
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  commandTool("node", ["--version"]),
  commandTool("npm", ["--version"]),
  commandTool("pnpm", ["--version"]),
  commandTool("yarn", ["--version"]),
  commandTool("python", ["--version"]),
  commandTool("python3", ["--version"]),
  commandTool("pip", ["--version"]),
  commandTool("pip3", ["--version"]),
  commandTool("docker", ["--version"]),
  commandTool("docker-compose", ["--version"]),
  {
    name: "docker compose",
    resolveCommand: "docker",
    resolveArgs: [],
    versionCommand: "docker",
    versionArgs: ["compose", "version"],
  },
  commandTool("git", ["--version"]),
];

export async function checkEnvironment(
  dirPath: string,
  options: EnvDetectorOptions = {},
): Promise<EnvironmentResult> {
  const rootPath = path.resolve(dirPath);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const platform = options.platform ?? process.platform;
  const commandRunner = options.commandRunner ?? defaultCommandRunner;
  const toolsToCheck = resolveToolsToCheck(options.dependencyResult);
  const dependencyTools = options.dependencyResult
    ? requiredToolsFromDependency(options.dependencyResult)
    : new Set<ToolName>();
  const result: EnvironmentResult = {
    rootPath,
    checkedTools: toolsToCheck,
    installedTools: [],
    missingTools: [],
    versionMismatches: [],
    warnings: [],
    confidence: 0,
    error: null,
  };

  const toolInfos = new Map<ToolName, ToolInfo>();

  for (const toolName of toolsToCheck) {
    const definition = toolDefinitionFor(toolName);
    const source = dependencyTools.has(toolName) ? "dependency" : "host";
    const tool = await checkTool(definition, {
      commandRunner,
      platform,
      timeoutMs,
      source,
      warnings: result.warnings,
    });

    toolInfos.set(tool.name, tool);
    if (tool.installed) {
      result.installedTools.push(tool);
    } else {
      result.missingTools.push(tool);
    }
  }

  applyDependencyChecks(options.dependencyResult, toolInfos, result);
  result.confidence = calculateConfidence(result);

  return result;
}

function commandTool(name: ToolName, versionArgs: string[]): ToolDefinition {
  return {
    name,
    resolveCommand: name,
    resolveArgs: [],
    versionCommand: name,
    versionArgs,
  };
}

async function checkTool(
  definition: ToolDefinition,
  options: {
    commandRunner: CommandRunner;
    platform: NodeJS.Platform;
    timeoutMs: number;
    source: ToolSource;
    warnings: string[];
  },
): Promise<ToolInfo> {
  const resolveCommand = options.platform === "win32" ? "where" : "which";
  const resolveArgs =
    options.platform === "win32"
      ? [definition.resolveCommand]
      : [definition.resolveCommand];
  const tool: ToolInfo = {
    name: definition.name,
    installed: false,
    version: null,
    path: null,
    source: options.source,
  };

  try {
    const resolved = await options.commandRunner(resolveCommand, resolveArgs, {
      timeoutMs: options.timeoutMs,
    });
    tool.path = firstLine(resolved.stdout);
  } catch (error) {
    options.warnings.push(missingToolWarning(definition.name, error));
    return tool;
  }

  try {
    const version = await options.commandRunner(
      definition.versionCommand,
      definition.versionArgs,
      { timeoutMs: options.timeoutMs },
    );
    tool.version = parseVersionOutput(version.stdout || version.stderr);
    tool.installed = true;
    return tool;
  } catch (error) {
    options.warnings.push(versionCheckWarning(definition.name, error));
    tool.path = null;
    return tool;
  }
}

async function defaultCommandRunner(
  command: string,
  args: string[],
  options: { timeoutMs: number },
): Promise<CommandResult> {
  const { stdout, stderr } = await execFileAsync(command, args, {
    timeout: options.timeoutMs,
    windowsHide: true,
  });
  return { stdout, stderr };
}

function resolveToolsToCheck(dependencyResult?: DependencyResult): ToolName[] {
  if (!dependencyResult) {
    return TOOL_DEFINITIONS.map((tool) => tool.name);
  }

  return TOOL_DEFINITIONS.map((tool) => tool.name).filter((toolName) =>
    requiredToolsFromDependency(dependencyResult).has(toolName),
  );
}

function requiredToolsFromDependency(
  dependencyResult: DependencyResult,
): Set<ToolName> {
  const required = new Set<ToolName>();

  for (const runtime of dependencyResult.detectedRuntimes) {
    addRuntimeTools(required, runtime);
  }

  return required;
}

function addRuntimeTools(required: Set<ToolName>, runtime: RuntimeInfo): void {
  if (runtime.name === "node") {
    required.add("node");
    if (
      runtime.packageManager &&
      isNodePackageManager(runtime.packageManager)
    ) {
      required.add(runtime.packageManager);
    }
  }

  if (runtime.name === "python") {
    required.add("python");
    if (runtime.packageManager === "pip") {
      required.add("pip");
    }
  }

  if (runtime.name === "docker") {
    required.add("docker");
    required.add("docker compose");
    required.add("docker-compose");
  }
}

function applyDependencyChecks(
  dependencyResult: DependencyResult | undefined,
  tools: Map<ToolName, ToolInfo>,
  result: EnvironmentResult,
): void {
  if (!dependencyResult) {
    return;
  }

  for (const runtime of dependencyResult.detectedRuntimes) {
    if (runtime.name === "node") {
      const node = tools.get("node");
      if (runtime.engineVersion && node?.installed && node.version) {
        const mismatch = compareNodeVersion(runtime.engineVersion, node.version);
        if (mismatch) {
          result.versionMismatches.push(mismatch);
          result.warnings.push(mismatch.message);
        }
      }
    }
  }
}

function compareNodeVersion(
  required: string,
  installedVersion: string,
): VersionMismatch | null {
  const installed = parseSemver(installedVersion);
  const requirement = parseMinimumRequirement(required);

  if (!installed || !requirement) {
    return null;
  }

  if (compareSemver(installed, requirement.version) >= 0) {
    return null;
  }

  return {
    tool: "node",
    required,
    installed: installedVersion,
    message: `Project requires node ${required} but ${installedVersion} is installed`,
  };
}

function toolDefinitionFor(name: ToolName): ToolDefinition {
  const definition = TOOL_DEFINITIONS.find((tool) => tool.name === name);
  if (!definition) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return definition;
}

function parseMinimumRequirement(
  required: string,
): { version: [number, number, number] } | null {
  const match = required.match(/>=\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) {
    return null;
  }

  return {
    version: [
      Number(match[1]),
      Number(match[2] ?? 0),
      Number(match[3] ?? 0),
    ],
  };
}

function parseSemver(version: string): [number, number, number] | null {
  const match = version.match(/v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) {
    return null;
  }

  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

function compareSemver(
  left: [number, number, number],
  right: [number, number, number],
): number {
  for (let index = 0; index < left.length; index += 1) {
    const diff = left[index] - right[index];
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

function isNodePackageManager(value: string): value is "npm" | "pnpm" | "yarn" {
  return value === "npm" || value === "pnpm" || value === "yarn";
}

function calculateConfidence(result: EnvironmentResult): number {
  if (result.checkedTools.length === 0) {
    return 0;
  }

  if (result.versionMismatches.length > 0 || result.missingTools.length > 0) {
    return 0.5;
  }

  if (result.warnings.length > 0) {
    return 0.75;
  }

  return 1;
}

function parseVersionOutput(output: string): string | null {
  const line = firstLine(output);
  if (!line) {
    return null;
  }

  return line.replace(/^[^\d]*(v?\d+(?:\.\d+){0,2}).*$/, "$1");
}

function firstLine(output: string): string | null {
  return output.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? null;
}

function missingToolWarning(toolName: ToolName, error: unknown): string {
  if (isTimeoutError(error)) {
    return `检测 ${toolDisplayName(toolName)} 超时。`;
  }

  return `未找到 ${toolDisplayName(toolName)}。`;
}

function versionCheckWarning(toolName: ToolName, error: unknown): string {
  if (isTimeoutError(error)) {
    return `检测 ${toolDisplayName(toolName)} 超时。`;
  }

  return `无法检测 ${toolDisplayName(toolName)} 是否已安装。`;
}

function toolDisplayName(toolName: ToolName): string {
  if (toolName === "docker compose" || toolName === "docker-compose") {
    return "Docker Compose";
  }

  if (toolName === "docker") {
    return "Docker";
  }

  return toolName;
}

function isTimeoutError(error: unknown): boolean {
  if (isObjectWithCode(error) && error.code === "ETIMEDOUT") {
    return true;
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "killed" in error &&
    "signal" in error &&
    error.killed === true &&
    error.signal === "SIGTERM"
  );
}

function isObjectWithCode(error: unknown): error is { code: unknown } {
  return typeof error === "object" && error !== null && "code" in error;
}
