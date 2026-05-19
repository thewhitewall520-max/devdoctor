import type { ScanResult } from "../scanner/index.js";
import { VERSION } from "../utils/version.js";

export { generateReport } from "./generator.js";
export type {
  IssueSeverity,
  ReportInput,
  ReportIssue,
  ReportResult,
} from "./types.js";

export function formatScanResult(result: ScanResult): string {
  return [
    `DevDoctor v${minorVersion(VERSION)}`,
    "Scanning repository...",
    `Repository path: ${result.repositoryPath}`,
    result.initialized ? "Scanner initialized." : "Scanner not initialized.",
  ].join("\n");
}

function minorVersion(version: string): string {
  const [major, minor] = version.split(".");
  return major && minor ? `${major}.${minor}` : version;
}
