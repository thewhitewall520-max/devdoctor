import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { detectDependencies } from "./dependency.js";

const tempRoots: string[] = [];

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

describe("detectDependencies", () => {
  it("detects an npm project", () => {
    const root = fixture({
      "package.json": JSON.stringify({ scripts: { dev: "vite", test: "vitest" } }),
      "package-lock.json": "",
    });

    const result = detectDependencies(root);

    expect(result.error).toBeNull();
    expect(result.rootPath).toBe(root);
    expect(result.detectedRuntimes).toEqual([
      {
        name: "node",
        packageManager: "npm",
        availableScripts: ["dev", "test"],
      },
    ]);
    expect(result.packageManagers).toEqual(["npm"]);
    expect(result.requiredFiles).toEqual([
      { path: "package.json", type: "config", stack: "node" },
      { path: "package-lock.json", type: "lockfile", stack: "node" },
    ]);
    expect(result.confidence).toBe(1);
  });

  it("detects a pnpm project", () => {
    const root = fixture({
      "package.json": JSON.stringify({ scripts: {} }),
      "pnpm-lock.yaml": "",
    });

    const result = detectDependencies(root);

    expect(result.detectedRuntimes[0]?.packageManager).toBe("pnpm");
    expect(result.packageManagers).toEqual(["pnpm"]);
  });

  it("detects a yarn project", () => {
    const root = fixture({
      "package.json": JSON.stringify({ scripts: {} }),
      "yarn.lock": "",
    });

    const result = detectDependencies(root);

    expect(result.detectedRuntimes[0]?.packageManager).toBe("yarn");
    expect(result.packageManagers).toEqual(["yarn"]);
  });

  it("extracts package.json engines.node", () => {
    const root = fixture({
      "package.json": JSON.stringify({ engines: { node: ">=18" } }),
    });

    const result = detectDependencies(root);

    expect(result.detectedRuntimes[0]?.engineVersion).toBe(">=18");
  });

  it("extracts .nvmrc", () => {
    const root = fixture({
      ".nvmrc": "20.11.1\n",
      "package.json": JSON.stringify({}),
    });

    const result = detectDependencies(root);

    expect(result.detectedRuntimes[0]?.version).toBe("20.11.1");
    expect(result.requiredFiles).toContainEqual({
      path: ".nvmrc",
      type: "runtime",
      stack: "node",
    });
  });

  it("extracts .node-version", () => {
    const root = fixture({
      ".node-version": "18.20.4\n",
      "package.json": JSON.stringify({}),
    });

    const result = detectDependencies(root);

    expect(result.detectedRuntimes[0]?.version).toBe("18.20.4");
    expect(result.requiredFiles).toContainEqual({
      path: ".node-version",
      type: "runtime",
      stack: "node",
    });
  });

  it("detects requirements.txt", () => {
    const root = fixture({
      "requirements.txt": "flask==3.0.0\n",
    });

    const result = detectDependencies(root);

    expect(result.detectedRuntimes).toEqual([
      { name: "python", packageManager: "pip" },
    ]);
    expect(result.requiredFiles).toEqual([
      { path: "requirements.txt", type: "config", stack: "python" },
    ]);
  });

  it("detects pyproject.toml", () => {
    const root = fixture({
      "pyproject.toml": '[project]\nrequires-python = ">=3.11"\n',
    });

    const result = detectDependencies(root);

    expect(result.detectedRuntimes).toEqual([
      { name: "python", version: ">=3.11", packageManager: "pip" },
    ]);
  });

  it("detects a poetry project", () => {
    const root = fixture({
      "pyproject.toml": "[tool.poetry]\nname = \"demo\"\nversion = \"0.1.0\"\n",
    });

    const result = detectDependencies(root);

    expect(result.detectedRuntimes[0]?.packageManager).toBe("poetry");
    expect(result.packageManagers).toEqual(["poetry"]);
  });

  it("detects a uv project", () => {
    const root = fixture({
      "pyproject.toml": "[tool.uv]\nmanaged = true\n",
    });

    const result = detectDependencies(root);

    expect(result.detectedRuntimes[0]?.packageManager).toBe("uv");
    expect(result.packageManagers).toEqual(["uv"]);
  });

  it("extracts docker-compose service names", () => {
    const root = fixture({
      "docker-compose.yml": [
        "services:",
        "  web:",
        "    image: node:20",
        "  db:",
        "    image: postgres:16",
      ].join("\n"),
    });

    const result = detectDependencies(root);

    expect(result.detectedRuntimes).toEqual([
      { name: "docker", serviceNames: ["web", "db"] },
    ]);
  });

  it("detects mixed Node and Python projects", () => {
    const root = fixture({
      "package.json": JSON.stringify({ scripts: { build: "tsc" } }),
      "requirements.txt": "",
    });

    const result = detectDependencies(root);

    expect(result.detectedRuntimes.map((runtime) => runtime.name)).toEqual([
      "node",
      "python",
    ]);
    expect(result.packageManagers).toEqual(["unknown", "pip"]);
  });

  it("warns for malformed package.json without crashing", () => {
    const root = fixture({
      "package.json": "{",
      "requirements.txt": "",
    });

    const result = detectDependencies(root);

    expect(result.error).toBeNull();
    expect(result.warnings).toContain("Malformed JSON in package.json");
    expect(result.detectedRuntimes.map((runtime) => runtime.name)).toEqual([
      "node",
      "python",
    ]);
  });

  it("warns for malformed pyproject.toml without crashing", () => {
    const root = fixture({
      "pyproject.toml": "[project\nname = \"demo\"\n",
      "package.json": JSON.stringify({}),
    });

    const result = detectDependencies(root);

    expect(result.error).toBeNull();
    expect(result.warnings).toContain("Malformed TOML in pyproject.toml");
    expect(result.detectedRuntimes.map((runtime) => runtime.name)).toEqual([
      "node",
      "python",
    ]);
  });

  it("warns for malformed docker-compose.yml without crashing", () => {
    const root = fixture({
      "docker-compose.yml": "services:\n  web: [unterminated\n",
      "package.json": JSON.stringify({}),
    });

    const result = detectDependencies(root);

    expect(result.error).toBeNull();
    expect(result.warnings).toContain("Malformed YAML in docker-compose.yml");
    expect(result.detectedRuntimes.map((runtime) => runtime.name)).toEqual([
      "node",
      "docker",
    ]);
  });

  it("handles an empty directory", () => {
    const root = fixture({});

    const result = detectDependencies(root);

    expect(result.error).toBeNull();
    expect(result.detectedRuntimes).toEqual([]);
    expect(result.packageManagers).toEqual([]);
    expect(result.requiredFiles).toEqual([]);
    expect(result.warnings).toEqual(["No dependency files found"]);
    expect(result.confidence).toBe(0);
  });

  it("returns ENOENT for a missing directory", () => {
    const root = fixture({});
    const missingPath = path.join(root, "missing");

    const result = detectDependencies(missingPath);

    expect(result.error).toBe(
      `ENOENT: directory not found: ${path.resolve(missingPath)}`,
    );
    expect(result.detectedRuntimes).toEqual([]);
  });
});

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "devdoctor-deps-"));
  tempRoots.push(root);

  for (const [fileName, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(root, fileName), contents);
  }

  return root;
}
