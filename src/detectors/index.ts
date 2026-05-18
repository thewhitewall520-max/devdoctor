export interface DetectorRegistry {
  count: number;
}

export function createDetectorRegistry(): DetectorRegistry {
  return { count: 0 };
}

export { detectDependencies } from "./dependency.js";
export type {
  DependencyResult,
  PackageManager,
  RequiredFile,
  RuntimeInfo,
  StackName,
} from "./dependency.js";
export { checkEnvironment } from "./environment.js";
export type {
  CommandResult,
  CommandRunner,
  EnvDetectorOptions,
  EnvironmentResult,
  ToolInfo,
  ToolName,
  ToolSource,
  VersionMismatch,
} from "./environment.js";
