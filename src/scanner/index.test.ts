import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { formatReport } from "../report/index.js";
import {
  initializeScanner,
  runDiagnosticScan,
  type DiagnosticScanDependencies,
} from "./index.js";

const tempRoots: string[] = [];

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

describe("initializeScanner", () => {
  it("returns scaffold scan state without running detectors", () => {
    const result = initializeScanner({ repositoryPath: "." });

    expect(result.initialized).toBe(true);
    expect(result.repositoryPath).toBe(process.cwd());
  });
});

describe("runDiagnosticScan", () => {
  it("runs on an empty directory", async () => {
    const root = fixture({});
    const result = await runDiagnosticScan(root, quietDependencies());

    expect(result.rootPath).toBe(root);
    expect(result.report.issues.some((issue) => issue.title === "未识别项目结构")).toBe(
      true,
    );
  });

  it("outputs a report for a Node project", async () => {
    const root = fixture({
      "package.json": JSON.stringify({ scripts: { dev: "vite" } }),
      "pnpm-lock.yaml": "",
    });
    const result = await runDiagnosticScan(root, quietDependencies());

    expect(result.scanner?.projectType).toBe("node");
    expect(result.dependency?.detectedRuntimes[0]?.name).toBe("node");
    expect(formatReport(result.report, { rootPath: root, noColor: true })).toContain(
      "DevDoctor v0.1",
    );
  });

  it("outputs a report for a Python project", async () => {
    const root = fixture({ "requirements.txt": "flask==3.0.0\n" });
    const result = await runDiagnosticScan(root, quietDependencies());

    expect(result.scanner?.projectType).toBe("python");
    expect(result.dependency?.detectedRuntimes[0]?.name).toBe("python");
  });

  it("outputs a report for a Docker project", async () => {
    const root = fixture({
      "docker-compose.yml": "services:\n  web:\n    image: nginx\n",
    });
    const result = await runDiagnosticScan(root, quietDependencies());

    expect(result.scanner?.projectType).toBe("docker");
    expect(result.dependency?.detectedRuntimes[0]?.name).toBe("docker");
  });

  it("includes occupied ports in the report", async () => {
    const root = fixture({ "package.json": "{}" });
    const result = await runDiagnosticScan(root, {
      ...quietDependencies(),
      inspectPorts: async () => ({
        rootPath: root,
        checkedPorts: [],
        occupiedPorts: [
          {
            port: 3000,
            occupied: true,
            protocol: "tcp",
            likelyService: "Node.js dev server",
            warning: null,
          },
        ],
        freePorts: [],
        warnings: [],
        confidence: 1,
        error: null,
      }),
    });

    expect(result.report.issues.map((issue) => issue.title)).toContain(
      "3000 端口被占用",
    );
  });

  it("includes missing tools in the report", async () => {
    const root = fixture({ "package.json": "{}" });
    const result = await runDiagnosticScan(root, {
      ...quietDependencies(),
      checkEnvironment: async () => ({
        rootPath: root,
        checkedTools: ["node"],
        installedTools: [],
        missingTools: [
          {
            name: "node",
            installed: false,
            version: null,
            path: null,
            source: "dependency",
          },
        ],
        versionMismatches: [],
        warnings: [],
        confidence: 0.5,
        error: null,
      }),
    });

    expect(result.report.issues.map((issue) => issue.title)).toContain(
      "Node.js 未安装",
    );
  });

  it("does not crash on malformed files", async () => {
    const root = fixture({ "package.json": "{" });
    const result = await runDiagnosticScan(root, quietDependencies());

    expect(result.dependency?.warnings).toContain("Malformed JSON in package.json");
    expect(result.report.warnings).toContain("Malformed JSON in package.json");
  });

  it("does not modify project files", async () => {
    const root = fixture({ "package.json": "{}" });
    const packagePath = path.join(root, "package.json");
    const before = fs.readFileSync(packagePath, "utf8");

    await runDiagnosticScan(root, quietDependencies());

    expect(fs.readFileSync(packagePath, "utf8")).toBe(before);
  });

  it("does not execute auto-fix commands", async () => {
    const root = fixture({ "package.json": "{}" });
    const commands: string[] = [];
    await runDiagnosticScan(root, {
      ...quietDependencies(),
      checkEnvironment: async () => {
        commands.push("node --version");
        return quietEnvironment(root);
      },
    });

    expect(commands.some((command) => command.includes("install"))).toBe(false);
  });

  it("keeps scanning when one module fails", async () => {
    const root = fixture({ "package.json": "{}" });
    const result = await runDiagnosticScan(root, {
      ...quietDependencies(),
      detectDependencies: () => {
        throw new Error("boom");
      },
    });

    expect(result.report.warnings).toContain("Dependency detector failed: boom");
    expect(result.scanner?.projectType).toBe("node");
  });
});

function quietDependencies(): DiagnosticScanDependencies {
  return {
    checkEnvironment: async (rootPath) => quietEnvironment(rootPath),
    inspectPorts: async (rootPath) => ({
      rootPath,
      checkedPorts: [],
      occupiedPorts: [],
      freePorts: [],
      warnings: [],
      confidence: 1,
      error: null,
    }),
  };
}

function quietEnvironment(rootPath: string) {
  return {
    rootPath,
    checkedTools: [],
    installedTools: [],
    missingTools: [],
    versionMismatches: [],
    warnings: [],
    confidence: 1,
    error: null,
  };
}

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "devdoctor-scan-"));
  tempRoots.push(root);

  for (const [fileName, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(root, fileName), contents);
  }

  return root;
}
