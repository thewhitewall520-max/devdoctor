import net from "node:net";
import path from "node:path";

export type PortProtocol = "tcp";

export interface PortStatus {
  port: number;
  occupied: boolean;
  protocol: PortProtocol;
  likelyService: string | null;
  warning: string | null;
}

export interface PortInspectionResult {
  rootPath: string;
  checkedPorts: PortStatus[];
  occupiedPorts: PortStatus[];
  freePorts: PortStatus[];
  warnings: string[];
  confidence: number;
  error: string | null;
}

export interface PortInspectorOptions {
  ports?: number[];
  timeoutMs?: number;
  probePort?: PortProbe;
}

export type PortProbe = (
  port: number,
  options: { host: "127.0.0.1"; timeoutMs: number },
) => Promise<PortProbeResult>;

export type PortProbeResult =
  | { status: "free" }
  | { status: "occupied" }
  | { status: "unknown"; warning: string };

export const DEFAULT_PORTS = [
  3000, 3001, 5173, 8000, 8080, 5432, 3306, 6379, 27017, 11434,
] as const;

const DEFAULT_TIMEOUT_MS = 500;
const LOCALHOST = "127.0.0.1" as const;

const LIKELY_SERVICES = new Map<number, string>([
  [3000, "Node.js dev server"],
  [3001, "Node.js dev server (alt)"],
  [5173, "Vite dev server"],
  [8000, "Python dev server"],
  [8080, "HTTP alt server"],
  [5432, "PostgreSQL"],
  [3306, "MySQL"],
  [6379, "Redis"],
  [27017, "MongoDB"],
  [11434, "Ollama"],
]);

export async function inspectPorts(
  dirPath: string,
  options: PortInspectorOptions = {},
): Promise<PortInspectionResult> {
  const rootPath = path.resolve(dirPath);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const probePort = options.probePort ?? defaultProbePort;
  const ports = normalizePorts(options.ports ?? [...DEFAULT_PORTS]);
  const result: PortInspectionResult = {
    rootPath,
    checkedPorts: [],
    occupiedPorts: [],
    freePorts: [],
    warnings: [],
    confidence: 0,
    error: null,
  };

  if (ports.length === 0) {
    return {
      ...result,
      error: "No known ports to inspect",
      warnings: ["No known ports to inspect"],
    };
  }

  for (const port of ports) {
    const status = await inspectPort(port, { probePort, timeoutMs });
    if (status.warning) {
      result.warnings.push(status.warning);
    }

    if (status.occupied) {
      result.occupiedPorts.push(status);
    } else if (!status.warning) {
      result.freePorts.push(status);
    }

    result.checkedPorts.push(status);
  }

  result.confidence = calculateConfidence(result);
  return result;
}

async function inspectPort(
  port: number,
  options: { probePort: PortProbe; timeoutMs: number },
): Promise<PortStatus> {
  const baseStatus = createPortStatus(port);

  try {
    const probe = await options.probePort(port, {
      host: LOCALHOST,
      timeoutMs: options.timeoutMs,
    });

    if (probe.status === "occupied") {
      return { ...baseStatus, occupied: true };
    }

    if (probe.status === "unknown") {
      return { ...baseStatus, warning: probe.warning };
    }

    return baseStatus;
  } catch (error) {
    return {
      ...baseStatus,
      warning: `Port ${port} probe failed: ${errorMessage(error)}`,
    };
  }
}

function createPortStatus(port: number): PortStatus {
  return {
    port,
    occupied: false,
    protocol: "tcp",
    likelyService: LIKELY_SERVICES.get(port) ?? null,
    warning: null,
  };
}

function normalizePorts(ports: number[]): number[] {
  const allowedPorts = new Set<number>(DEFAULT_PORTS);
  const normalized: number[] = [];

  for (const port of ports) {
    if (!allowedPorts.has(port) || normalized.includes(port)) {
      continue;
    }
    normalized.push(port);
  }

  return normalized;
}

function defaultProbePort(
  port: number,
  options: { host: "127.0.0.1"; timeoutMs: number },
): Promise<PortProbeResult> {
  return new Promise((resolve) => {
    const server = net.createServer();
    let settled = false;

    const finish = (result: PortProbeResult) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      server.removeAllListeners();

      if (server.listening) {
        server.close(() => resolve(result));
        return;
      }

      resolve(result);
    };

    const timeout = setTimeout(() => {
      finish({
        status: "unknown",
        warning: `Port ${port} probe timed out after ${options.timeoutMs}ms`,
      });
    }, options.timeoutMs);

    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        finish({ status: "occupied" });
        return;
      }

      finish({
        status: "unknown",
        warning: `Port ${port} probe failed: ${errorMessage(error)}`,
      });
    });

    server.once("listening", () => {
      finish({ status: "free" });
    });

    server.listen(port, options.host);
  });
}

function calculateConfidence(result: PortInspectionResult): number {
  if (result.checkedPorts.length === 0) {
    return 0;
  }

  if (result.warnings.length > 0) {
    return 0.75;
  }

  return 1;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "unknown error";
}
