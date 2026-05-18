import { createDetectorRegistry } from "../detectors/index.js";
import { resolveRepositoryPath } from "../utils/path.js";

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
