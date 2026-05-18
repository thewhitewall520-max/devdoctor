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
