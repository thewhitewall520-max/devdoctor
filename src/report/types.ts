import type { EnvironmentResult } from "../detectors/environment.js";
import type { DependencyResult } from "../detectors/dependency.js";
import type { PortInspectionResult } from "../inspectors/ports.js";
import type { ScannerResult } from "../scanners/repo.js";

export type IssueSeverity = "critical" | "warning" | "info";

export interface ReportIssue {
  severity: IssueSeverity;
  title: string;
  explanation: string;
  suggestedAction: string;
}

export interface ReportResult {
  summary: string;
  issues: ReportIssue[];
  warnings: string[];
  recommendations: string[];
  confidence: number;
}

export interface ReportInput {
  scanner?: ScannerResult;
  dependency?: DependencyResult;
  environment?: EnvironmentResult;
  ports?: PortInspectionResult;
}
