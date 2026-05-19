import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

import { parse as parseToml } from "smol-toml";

export type StackName = "node" | "python" | "docker";
export type PackageManager =
  | "npm"
  | "pnpm"
  | "yarn"
  | "bun"
  | "pip"
  | "poetry"
  | "uv"
  | "unknown";

export interface RuntimeInfo {
  name: StackName;
  version?: string;
  packageManager?: PackageManager;
  engineVersion?: string;
  availableScripts?: string[];
  serviceNames?: string[];
}

export interface RequiredFile {
  path: string;
  type: "runtime" | "config" | "lockfile";
  stack: StackName;
}

export interface DependencyResult {
  rootPath: string;
  detectedRuntimes: RuntimeInfo[];
  packageManagers: PackageManager[];
  requiredFiles: RequiredFile[];
  warnings: string[];
  confidence: number;
  error: string | null;
}

interface PackageJsonConfig {
  scripts?: unknown;
  engines?: {
    node?: unknown;
  };
}

interface TomlProjectConfig {
  project?: {
    "requires-python"?: unknown;
  };
  tool?: {
    poetry?: unknown;
    uv?: unknown;
  };
}

const require = createRequire(import.meta.url);
const yaml = require("js-yaml") as {
  load(input: string): unknown;
};

export function detectDependencies(dirPath: string): DependencyResult {
  const rootPath = path.resolve(dirPath);
  const result = createBaseResult(rootPath);

  const fileNames = readRootFileNames(rootPath);
  if ("error" in fileNames) {
    return {
      ...result,
      error: fileNames.error,
      warnings: [fileNames.error],
    };
  }

  detectNode(rootPath, fileNames, result);
  detectPython(rootPath, fileNames, result);
  detectDocker(rootPath, fileNames, result);

  if (result.detectedRuntimes.length === 0 && result.error === null) {
    result.warnings.push("No dependency files found");
  }

  result.confidence = calculateConfidence(result);

  return result;
}

function createBaseResult(rootPath: string): DependencyResult {
  return {
    rootPath,
    detectedRuntimes: [],
    packageManagers: [],
    requiredFiles: [],
    warnings: [],
    confidence: 0,
    error: null,
  };
}

function readRootFileNames(rootPath: string): Set<string> | { error: string } {
  try {
    const stat = fs.statSync(rootPath);
    if (!stat.isDirectory()) {
      return { error: `ENOTDIR: path is not a directory: ${rootPath}` };
    }

    return new Set(
      fs
        .readdirSync(rootPath, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name),
    );
  } catch (error) {
    return { error: formatFileSystemError(error, rootPath) };
  }
}

function detectNode(
  rootPath: string,
  fileNames: Set<string>,
  result: DependencyResult,
): void {
  const hasPackageJson = fileNames.has("package.json");
  const hasNvmrc = fileNames.has(".nvmrc");
  const hasNodeVersion = fileNames.has(".node-version");

  if (!hasPackageJson && !hasNvmrc && !hasNodeVersion) {
    return;
  }

  const runtime: RuntimeInfo = { name: "node" };

  if (hasPackageJson) {
    addRequiredFile(result, "package.json", "config", "node");
    const packageJson = readJsonFile<PackageJsonConfig>(
      path.join(rootPath, "package.json"),
      result,
      "package.json",
    );

    if (packageJson) {
      runtime.availableScripts = scriptNames(packageJson.scripts);
      if (typeof packageJson.engines?.node === "string") {
        runtime.engineVersion = packageJson.engines.node;
      }
    }
  }

  const nodeVersion = readFirstVersionHint(rootPath, fileNames, result, [
    ".nvmrc",
    ".node-version",
  ]);
  if (nodeVersion) {
    runtime.version = nodeVersion;
  }

  const packageManager = detectNodePackageManager(fileNames, result);
  runtime.packageManager = packageManager;
  addPackageManager(result, packageManager);
  result.detectedRuntimes.push(runtime);
}

function detectPython(
  rootPath: string,
  fileNames: Set<string>,
  result: DependencyResult,
): void {
  const hasRequirements = fileNames.has("requirements.txt");
  const hasPyproject = fileNames.has("pyproject.toml");
  const hasRuntime = fileNames.has("runtime.txt");

  if (!hasRequirements && !hasPyproject && !hasRuntime) {
    return;
  }

  const runtime: RuntimeInfo = { name: "python" };
  let pyproject: TomlProjectConfig | null = null;

  if (hasRequirements) {
    addRequiredFile(result, "requirements.txt", "config", "python");
  }

  if (hasPyproject) {
    addRequiredFile(result, "pyproject.toml", "config", "python");
    pyproject = readTomlFile<TomlProjectConfig>(
      path.join(rootPath, "pyproject.toml"),
      result,
      "pyproject.toml",
    );

    const requiresPython = pyproject?.project?.["requires-python"];
    if (typeof requiresPython === "string") {
      runtime.version = requiresPython;
    }
  }

  if (hasRuntime) {
    addRequiredFile(result, "runtime.txt", "runtime", "python");
    const runtimeVersion = readTextFile(
      path.join(rootPath, "runtime.txt"),
      result,
      "runtime.txt",
    );
    if (runtimeVersion) {
      runtime.version = runtimeVersion;
    }
  }

  const packageManager = detectPythonPackageManager(pyproject, hasRequirements);
  runtime.packageManager = packageManager;
  addPackageManager(result, packageManager);
  result.detectedRuntimes.push(runtime);
}

function detectDocker(
  rootPath: string,
  fileNames: Set<string>,
  result: DependencyResult,
): void {
  const composePath = ["docker-compose.yml", "docker-compose.yaml"].find(
    (fileName) => fileNames.has(fileName),
  );

  if (!composePath) {
    return;
  }

  addRequiredFile(result, composePath, "config", "docker");
  const runtime: RuntimeInfo = { name: "docker", serviceNames: [] };
  const compose = readYamlFile(path.join(rootPath, composePath), result, composePath);

  if (isObjectRecord(compose) && isObjectRecord(compose.services)) {
    runtime.serviceNames = Object.keys(compose.services);
  }

  result.detectedRuntimes.push(runtime);
}

function detectNodePackageManager(
  fileNames: Set<string>,
  result: DependencyResult,
): PackageManager {
  if (fileNames.has("package-lock.json")) {
    addRequiredFile(result, "package-lock.json", "lockfile", "node");
    return "npm";
  }

  if (fileNames.has("pnpm-lock.yaml")) {
    addRequiredFile(result, "pnpm-lock.yaml", "lockfile", "node");
    return "pnpm";
  }

  if (fileNames.has("yarn.lock")) {
    addRequiredFile(result, "yarn.lock", "lockfile", "node");
    return "yarn";
  }

  if (fileNames.has("bun.lockb")) {
    addRequiredFile(result, "bun.lockb", "lockfile", "node");
    return "bun";
  }

  return "unknown";
}

function detectPythonPackageManager(
  pyproject: TomlProjectConfig | null,
  hasRequirements: boolean,
): PackageManager {
  if (pyproject?.tool && "poetry" in pyproject.tool) {
    return "poetry";
  }

  if (pyproject?.tool && "uv" in pyproject.tool) {
    return "uv";
  }

  return hasRequirements || pyproject ? "pip" : "unknown";
}

function readFirstVersionHint(
  rootPath: string,
  fileNames: Set<string>,
  result: DependencyResult,
  candidates: string[],
): string | undefined {
  for (const candidate of candidates) {
    if (!fileNames.has(candidate)) {
      continue;
    }

    addRequiredFile(result, candidate, "runtime", "node");
    const version = readTextFile(path.join(rootPath, candidate), result, candidate);
    if (version) {
      return version;
    }
  }

  return undefined;
}

function readJsonFile<T>(
  filePath: string,
  result: DependencyResult,
  relativePath: string,
): T | null {
  const content = readTextFile(filePath, result, relativePath);
  if (content === null) {
    return null;
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    result.warnings.push(`Malformed JSON in ${relativePath}`);
    return null;
  }
}

function readTomlFile<T>(
  filePath: string,
  result: DependencyResult,
  relativePath: string,
): T | null {
  const content = readTextFile(filePath, result, relativePath);
  if (content === null) {
    return null;
  }

  try {
    return parseToml(content) as T;
  } catch {
    result.warnings.push(`Malformed TOML in ${relativePath}`);
    return null;
  }
}

function readYamlFile(
  filePath: string,
  result: DependencyResult,
  relativePath: string,
): unknown {
  const content = readTextFile(filePath, result, relativePath);
  if (content === null) {
    return null;
  }

  try {
    return yaml.load(content);
  } catch {
    result.warnings.push(`Malformed YAML in ${relativePath}`);
    return null;
  }
}

function readTextFile(
  filePath: string,
  result: DependencyResult,
  relativePath: string,
): string | null {
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    result.warnings.push(`Unable to read ${relativePath}`);
    return null;
  }
}

function scriptNames(scripts: unknown): string[] {
  if (!isObjectRecord(scripts)) {
    return [];
  }

  return Object.keys(scripts);
}

function addRequiredFile(
  result: DependencyResult,
  filePath: string,
  type: RequiredFile["type"],
  stack: StackName,
): void {
  if (
    result.requiredFiles.some(
      (file) => file.path === filePath && file.stack === stack,
    )
  ) {
    return;
  }

  result.requiredFiles.push({ path: filePath, type, stack });
}

function addPackageManager(
  result: DependencyResult,
  packageManager: PackageManager,
): void {
  if (!result.packageManagers.includes(packageManager)) {
    result.packageManagers.push(packageManager);
  }
}

function calculateConfidence(result: DependencyResult): number {
  if (result.detectedRuntimes.length === 0) {
    return 0;
  }

  return result.warnings.length === 0 ? 1 : 0.75;
}

function formatFileSystemError(error: unknown, rootPath: string): string {
  if (isNodeError(error)) {
    if (error.code === "ENOENT") {
      return `ENOENT: directory not found: ${rootPath}`;
    }

    if (error.code === "EACCES") {
      return `EACCES: permission denied: ${rootPath}`;
    }
  }

  return `EUNKNOWN: unable to scan directory: ${rootPath}`;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
