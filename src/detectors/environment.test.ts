import { describe, expect, it } from "vitest";

import type { DependencyResult } from "./dependency.js";
import {
  checkEnvironment,
  type CommandRunner,
  type ToolName,
} from "./environment.js";

describe("checkEnvironment", () => {
  it("detects an installed tool", async () => {
    const result = await checkEnvironment(".", {
      dependencyResult: dependencyResult({
        detectedRuntimes: [{ name: "node", packageManager: "npm" }],
      }),
      commandRunner: fakeRunner({
        which: { node: "/usr/local/bin/node", npm: "/usr/local/bin/npm" },
        versions: { node: "v20.11.1", npm: "10.2.4" },
      }),
    });

    expect(result.installedTools).toContainEqual({
      name: "node",
      installed: true,
      version: "20.11.1",
      path: "/usr/local/bin/node",
      source: "dependency",
    });
    expect(result.missingTools).toEqual([]);
  });

  it("detects a missing tool", async () => {
    const result = await checkEnvironment(".", {
      dependencyResult: dependencyResult({
        detectedRuntimes: [{ name: "node", packageManager: "pnpm" }],
      }),
      commandRunner: fakeRunner({
        which: { node: "/bin/node" },
        versions: { node: "v20.0.0" },
      }),
    });

    expect(result.missingTools.map((tool) => tool.name)).toContain("pnpm");
    expect(result.warnings.some((warning) => warning.includes("pnpm"))).toBe(true);
  });

  it("handles command timeout", async () => {
    const result = await checkEnvironment(".", {
      dependencyResult: dependencyResult({
        detectedRuntimes: [{ name: "node" }],
      }),
      commandRunner: async () => {
        throw Object.assign(new Error("timeout"), {
          killed: true,
          signal: "SIGTERM",
        });
      },
    });

    expect(result.missingTools).toHaveLength(1);
    expect(result.missingTools[0]?.name).toBe("node");
    expect(result.warnings[0]).toContain("command timed out");
  });

  it("handles command errors", async () => {
    const result = await checkEnvironment(".", {
      dependencyResult: dependencyResult({
        detectedRuntimes: [{ name: "node" }],
      }),
      commandRunner: async () => {
        throw new Error("not found");
      },
    });

    expect(result.error).toBeNull();
    expect(result.missingTools[0]?.installed).toBe(false);
    expect(result.warnings[0]).toContain("not found");
  });

  it("accepts a matching node version", async () => {
    const result = await checkEnvironment(".", {
      dependencyResult: dependencyResult({
        detectedRuntimes: [
          { name: "node", packageManager: "npm", engineVersion: ">=18" },
        ],
      }),
      commandRunner: fakeRunner({
        which: { node: "/bin/node", npm: "/bin/npm" },
        versions: { node: "v20.0.0", npm: "10.0.0" },
      }),
    });

    expect(result.versionMismatches).toEqual([]);
  });

  it("reports a node version mismatch", async () => {
    const result = await checkEnvironment(".", {
      dependencyResult: dependencyResult({
        detectedRuntimes: [
          { name: "node", packageManager: "npm", engineVersion: ">=20" },
        ],
      }),
      commandRunner: fakeRunner({
        which: { node: "/bin/node", npm: "/bin/npm" },
        versions: { node: "v18.17.0", npm: "9.0.0" },
      }),
    });

    expect(result.versionMismatches).toEqual([
      {
        tool: "node",
        required: ">=20",
        installed: "18.17.0",
        message: "Project requires node >=20 but 18.17.0 is installed",
      },
    ]);
  });

  it("reports pnpm required but missing", async () => {
    const result = await checkEnvironment(".", {
      dependencyResult: dependencyResult({
        detectedRuntimes: [{ name: "node", packageManager: "pnpm" }],
      }),
      commandRunner: fakeRunner({
        which: { node: "/bin/node" },
        versions: { node: "v20.0.0" },
      }),
    });

    expect(result.missingTools.map((tool) => tool.name)).toContain("pnpm");
  });

  it("reports docker required but missing", async () => {
    const result = await checkEnvironment(".", {
      dependencyResult: dependencyResult({
        detectedRuntimes: [{ name: "docker", serviceNames: ["web"] }],
      }),
      commandRunner: fakeRunner({ which: {}, versions: {} }),
    });

    expect(result.missingTools.map((tool) => tool.name)).toEqual([
      "docker",
      "docker-compose",
      "docker compose",
    ]);
  });

  it("reports a python project without python", async () => {
    const result = await checkEnvironment(".", {
      dependencyResult: dependencyResult({
        detectedRuntimes: [{ name: "python", packageManager: "pip" }],
      }),
      commandRunner: fakeRunner({ which: {}, versions: {} }),
    });

    expect(result.missingTools.map((tool) => tool.name)).toEqual([
      "python",
      "pip",
    ]);
  });

  it("checks all known tools without dependency input", async () => {
    const result = await checkEnvironment(".", {
      commandRunner: fakeRunner({
        which: { node: "/bin/node" },
        versions: { node: "v20.0.0" },
      }),
    });

    expect(result.checkedTools).toEqual([
      "node",
      "npm",
      "pnpm",
      "yarn",
      "python",
      "python3",
      "pip",
      "pip3",
      "docker",
      "docker-compose",
      "docker compose",
      "git",
    ]);
    expect(result.installedTools.map((tool) => tool.name)).toContain("node");
  });

  it("uses where on Windows for cross-platform command resolution", async () => {
    const calls: Array<[string, string[]]> = [];
    const runner: CommandRunner = async (command, args) => {
      calls.push([command, args]);
      return { stdout: "C:\\node\\node.exe\n", stderr: "" };
    };

    await checkEnvironment(".", {
      platform: "win32",
      dependencyResult: dependencyResult({
        detectedRuntimes: [{ name: "node" }],
      }),
      commandRunner: runner,
    });

    expect(calls[0]).toEqual(["where", ["node"]]);
  });

  it("does not execute install commands", async () => {
    const calls: Array<[string, string[]]> = [];

    await checkEnvironment(".", {
      dependencyResult: dependencyResult({
        detectedRuntimes: [
          { name: "node", packageManager: "npm" },
          { name: "python", packageManager: "pip" },
        ],
      }),
      commandRunner: async (command, args) => {
        calls.push([command, args]);
        throw new Error("missing");
      },
    });

    expect(
      calls.some(([command, args]) => {
        return command.includes("install") || args.includes("install");
      }),
    ).toBe(false);
  });
});

function dependencyResult(
  partial: Pick<DependencyResult, "detectedRuntimes">,
): DependencyResult {
  return {
    rootPath: process.cwd(),
    detectedRuntimes: partial.detectedRuntimes,
    packageManagers: [],
    requiredFiles: [],
    warnings: [],
    confidence: 1,
    error: null,
  };
}

function fakeRunner(config: {
  which: Partial<Record<ToolName | "docker", string>>;
  versions: Partial<Record<ToolName | "docker", string>>;
}): CommandRunner {
  return async (command, args) => {
    if (command === "which" || command === "where") {
      const toolName = args[0] as ToolName;
      const resolved = config.which[toolName];
      if (!resolved) {
        throw new Error(`${toolName} not found`);
      }
      return { stdout: `${resolved}\n`, stderr: "" };
    }

    const toolName =
      command === "docker" && args[0] === "compose"
        ? "docker compose"
        : (command as ToolName);
    const version = config.versions[toolName];
    if (!version) {
      throw new Error(`${toolName} version unavailable`);
    }
    return { stdout: `${version}\n`, stderr: "" };
  };
}
