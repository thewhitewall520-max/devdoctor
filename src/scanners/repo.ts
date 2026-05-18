import fs from "node:fs";
import path from "node:path";

export type PrimaryProjectType = "node" | "python" | "docker";
export type ProjectType = PrimaryProjectType | "mixed" | "unknown";
export type DetectedFileType = PrimaryProjectType | "env" | "readme";

export interface DetectedFile {
  path: string;
  type: DetectedFileType;
}

export interface ScannerResult {
  rootPath: string;
  path: string;
  projectType: ProjectType;
  projectTypes: PrimaryProjectType[];
  detectedFiles: DetectedFile[];
  missingOptionalFiles: string[];
  confidence: number;
  warnings: string[];
  error: string | null;
}

type Marker = {
  fileName: string;
  type: DetectedFileType;
  primary: boolean;
};

const MARKERS: Marker[] = [
  { fileName: "package.json", type: "node", primary: true },
  { fileName: "pyproject.toml", type: "python", primary: true },
  { fileName: "requirements.txt", type: "python", primary: true },
  { fileName: "docker-compose.yml", type: "docker", primary: true },
  { fileName: "docker-compose.yaml", type: "docker", primary: true },
  { fileName: ".env.example", type: "env", primary: false },
  { fileName: "README.md", type: "readme", primary: false },
];

const OPTIONAL_FILES = [".env.example", "README.md"];

export function scanRepo(dirPath: string): ScannerResult {
  const rootPath = path.resolve(dirPath);
  const baseResult = createBaseResult(rootPath);

  let fileNames: Set<string>;
  try {
    const stat = fs.statSync(rootPath);
    if (!stat.isDirectory()) {
      return {
        ...baseResult,
        error: `ENOTDIR: path is not a directory: ${rootPath}`,
      };
    }

    fileNames = new Set(
      fs
        .readdirSync(rootPath, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name),
    );
  } catch (error) {
    return {
      ...baseResult,
      error: formatFileSystemError(error, rootPath),
    };
  }

  const detectedFiles = MARKERS.filter((marker) =>
    fileNames.has(marker.fileName),
  ).map((marker) => ({
    path: marker.fileName,
    type: marker.type,
  }));

  const projectTypes = uniquePrimaryTypes(detectedFiles);
  const projectType = resolveProjectType(projectTypes);
  const missingOptionalFiles = OPTIONAL_FILES.filter((fileName) => {
    return !fileNames.has(fileName);
  });

  return {
    ...baseResult,
    projectType,
    projectTypes,
    detectedFiles,
    missingOptionalFiles,
    confidence: projectType === "unknown" ? 0 : 1,
    warnings:
      projectType === "unknown" ? ["No recognized project stack found."] : [],
  };
}

function createBaseResult(rootPath: string): ScannerResult {
  return {
    rootPath,
    path: rootPath,
    projectType: "unknown",
    projectTypes: [],
    detectedFiles: [],
    missingOptionalFiles: [...OPTIONAL_FILES],
    confidence: 0,
    warnings: [],
    error: null,
  };
}

function uniquePrimaryTypes(detectedFiles: DetectedFile[]): PrimaryProjectType[] {
  const types: PrimaryProjectType[] = [];

  for (const file of detectedFiles) {
    if (isPrimaryProjectType(file.type) && !types.includes(file.type)) {
      types.push(file.type);
    }
  }

  return types;
}

function resolveProjectType(projectTypes: PrimaryProjectType[]): ProjectType {
  if (projectTypes.length === 0) {
    return "unknown";
  }

  if (projectTypes.length === 1) {
    return projectTypes[0];
  }

  return "mixed";
}

function isPrimaryProjectType(
  type: DetectedFileType,
): type is PrimaryProjectType {
  return type === "node" || type === "python" || type === "docker";
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

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
