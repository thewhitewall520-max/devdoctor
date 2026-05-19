import { createDetectorRegistry } from "../detectors/index.js";
import { checkEnvironment } from "../detectors/environment.js";
import { detectDependencies } from "../detectors/dependency.js";
import { generateReport } from "../report/generator.js";
import { inspectPorts } from "../inspectors/ports.js";
import { resolveRepositoryPath } from "../utils/path.js";
import { scanRepo } from "../scanners/repo.js";
import type { DependencyResult } from "../detectors/dependency.js";
import type { EnvironmentResult } from "../detectors/environment.js";
import type { PortInspectionResult } from "../inspectors/ports.js";
import type { ReportResult } from "../report/types.js";
import type { ScannerResult } from "../scanners/repo.js";

export interface ScanOptions {
  repositoryPath: string;
}

export interface ScanResult {
  repositoryPath: string;
  initialized: boolean;
}

export function initializeScanner(options: ScanOptions): ScanResult {
  const detectors = createDetectorRegistry();
  void detectors;

  return {
    repositoryPath: resolveRepositoryPath(options.repositoryPath),
    initialized: true,
  };
}

export interface DiagnosticScanResult {
  rootPath: string;
  scanner?: ScannerResult;
  dependency?: DependencyResult;
  environment?: EnvironmentResult;
  ports?: PortInspectionResult;
  report: ReportResult;
}

export interface DiagnosticScanDependencies {
  scanRepo?: typeof scanRepo;
  detectDependencies?: typeof detectDependencies;
  checkEnvironment?: typeof checkEnvironment;
  inspectPorts?: typeof inspectPorts;
  generateReport?: typeof generateReport;
}

export async function runDiagnosticScan(
  rootPath: string,
  dependencies: DiagnosticScanDependencies = {},
): Promise<DiagnosticScanResult> {
  const resolvedRootPath = resolveRepositoryPath(rootPath);
  const warnings: string[] = [];
  const modules = {
    scanRepo: dependencies.scanRepo ?? scanRepo,
    detectDependencies: dependencies.detectDependencies ?? detectDependencies,
    checkEnvironment: dependencies.checkEnvironment ?? checkEnvironment,
    inspectPorts: dependencies.inspectPorts ?? inspectPorts,
    generateReport: dependencies.generateReport ?? generateReport,
  };

  const scanner = runModule("Repo scanner", warnings, () =>
    modules.scanRepo(resolvedRootPath),
  );
  const dependency = runModule("Dependency detector", warnings, () =>
    modules.detectDependencies(resolvedRootPath),
  );
  const environment = await runAsyncModule("Environment detector", warnings, () =>
    modules.checkEnvironment(resolvedRootPath, {
      dependencyResult: dependency,
    }),
  );
  const ports = await runAsyncModule("Port inspector", warnings, () =>
    modules.inspectPorts(resolvedRootPath),
  );

  const reportInput = {
    scanner,
    dependency,
    environment,
    ports,
  };
  const report = runModule("Report generator", warnings, () =>
    modules.generateReport(reportInput),
  ) ?? {
    summary: "发现 0 个问题。",
    issues: [],
    warnings: [],
    recommendations: [],
    confidence: 0,
  };

  report.warnings = [...new Set([...report.warnings, ...warnings])];

  return {
    rootPath: resolvedRootPath,
    scanner,
    dependency,
    environment,
    ports,
    report,
  };
}

function runModule<T>(
  moduleName: string,
  warnings: string[],
  run: () => T,
): T | undefined {
  try {
    return run();
  } catch (error) {
    warnings.push(`${moduleName} failed: ${errorMessage(error)}`);
    return undefined;
  }
}

async function runAsyncModule<T>(
  moduleName: string,
  warnings: string[],
  run: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await run();
  } catch (error) {
    warnings.push(`${moduleName} failed: ${errorMessage(error)}`);
    return undefined;
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "unknown error";
}
