import { createCliProgram } from "./cli/program.js";

export async function main(argv: string[] = process.argv): Promise<void> {
  const program = createCliProgram();
  await program.parseAsync(argv);
}

export { createCliProgram } from "./cli/program.js";
export { scanRepo } from "./scanners/repo.js";
export type {
  DetectedFile,
  DetectedFileType,
  PrimaryProjectType,
  ProjectType,
  ScannerResult,
} from "./scanners/repo.js";
export { detectDependencies } from "./detectors/dependency.js";
export type {
  DependencyResult,
  PackageManager,
  RequiredFile,
  RuntimeInfo,
  StackName,
} from "./detectors/dependency.js";
export { checkEnvironment } from "./detectors/environment.js";
export type {
  CommandResult,
  CommandRunner,
  EnvDetectorOptions,
  EnvironmentResult,
  ToolInfo,
  ToolName,
  ToolSource,
  VersionMismatch,
} from "./detectors/environment.js";
export { inspectPorts } from "./inspectors/ports.js";
export type {
  PortInspectionResult,
  PortInspectorOptions,
  PortProbe,
  PortProbeResult,
  PortProtocol,
  PortStatus,
} from "./inspectors/ports.js";
export { generateReport } from "./report/generator.js";
export { formatReport } from "./report/formatter.js";
export type {
  IssueSeverity,
  ReportInput,
  ReportIssue,
  ReportResult,
} from "./report/types.js";
export type { FormatReportOptions } from "./report/formatter.js";
export { runDiagnosticScan } from "./scanner/index.js";
export type {
  DiagnosticScanDependencies,
  DiagnosticScanResult,
} from "./scanner/index.js";
