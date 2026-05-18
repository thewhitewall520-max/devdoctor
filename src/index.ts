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
