import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { scanRepo } from "./repo.js";

const tempRoots: string[] = [];

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

describe("scanRepo", () => {
  it("detects a pure Node project", () => {
    const root = fixture(["package.json"]);

    const result = scanRepo(root);

    expect(result.error).toBeNull();
    expect(result.rootPath).toBe(root);
    expect(result.path).toBe(root);
    expect(result.projectType).toBe("node");
    expect(result.projectTypes).toEqual(["node"]);
    expect(result.detectedFiles).toEqual([
      { path: "package.json", type: "node" },
    ]);
    expect(result.confidence).toBe(1);
    expect(result.warnings).toEqual([]);
  });

  it("detects a pure Python project from pyproject.toml", () => {
    const root = fixture(["pyproject.toml"]);

    const result = scanRepo(root);

    expect(result.projectType).toBe("python");
    expect(result.projectTypes).toEqual(["python"]);
    expect(result.detectedFiles).toEqual([
      { path: "pyproject.toml", type: "python" },
    ]);
  });

  it("detects a pure Python project from requirements.txt", () => {
    const root = fixture(["requirements.txt"]);

    const result = scanRepo(root);

    expect(result.projectType).toBe("python");
    expect(result.projectTypes).toEqual(["python"]);
    expect(result.detectedFiles).toEqual([
      { path: "requirements.txt", type: "python" },
    ]);
  });

  it("detects a Docker compose project", () => {
    const root = fixture(["docker-compose.yml"]);

    const result = scanRepo(root);

    expect(result.projectType).toBe("docker");
    expect(result.projectTypes).toEqual(["docker"]);
    expect(result.detectedFiles).toEqual([
      { path: "docker-compose.yml", type: "docker" },
    ]);
  });

  it("detects a mixed project", () => {
    const root = fixture(["package.json", "pyproject.toml", "docker-compose.yml"]);

    const result = scanRepo(root);

    expect(result.projectType).toBe("mixed");
    expect(result.projectTypes).toEqual(["node", "python", "docker"]);
    expect(result.detectedFiles).toEqual([
      { path: "package.json", type: "node" },
      { path: "pyproject.toml", type: "python" },
      { path: "docker-compose.yml", type: "docker" },
    ]);
  });

  it("returns unknown for a directory with no recognized markers", () => {
    const root = fixture(["notes.txt"]);

    const result = scanRepo(root);

    expect(result.projectType).toBe("unknown");
    expect(result.projectTypes).toEqual([]);
    expect(result.detectedFiles).toEqual([]);
    expect(result.confidence).toBe(0);
    expect(result.warnings).toEqual(["No recognized project stack found."]);
  });

  it("detects .env.example without making it a primary project type", () => {
    const root = fixture([".env.example"]);

    const result = scanRepo(root);

    expect(result.projectType).toBe("unknown");
    expect(result.projectTypes).toEqual([]);
    expect(result.detectedFiles).toEqual([
      { path: ".env.example", type: "env" },
    ]);
    expect(result.missingOptionalFiles).toEqual(["README.md"]);
  });

  it("detects README.md without making it a primary project type", () => {
    const root = fixture(["README.md"]);

    const result = scanRepo(root);

    expect(result.projectType).toBe("unknown");
    expect(result.projectTypes).toEqual([]);
    expect(result.detectedFiles).toEqual([
      { path: "README.md", type: "readme" },
    ]);
    expect(result.missingOptionalFiles).toEqual([".env.example"]);
  });

  it("detects both docker-compose.yml and docker-compose.yaml", () => {
    const root = fixture(["docker-compose.yml", "docker-compose.yaml"]);

    const result = scanRepo(root);

    expect(result.projectType).toBe("docker");
    expect(result.projectTypes).toEqual(["docker"]);
    expect(result.detectedFiles).toEqual([
      { path: "docker-compose.yml", type: "docker" },
      { path: "docker-compose.yaml", type: "docker" },
    ]);
  });

  it("handles an empty directory", () => {
    const root = fixture([]);

    const result = scanRepo(root);

    expect(result.error).toBeNull();
    expect(result.projectType).toBe("unknown");
    expect(result.projectTypes).toEqual([]);
    expect(result.detectedFiles).toEqual([]);
    expect(result.missingOptionalFiles).toEqual([".env.example", "README.md"]);
  });

  it("returns ENOENT for a missing directory", () => {
    const root = fixture([]);
    const missingPath = path.join(root, "missing");

    const result = scanRepo(missingPath);

    expect(result.error).toBe(
      `ENOENT: directory not found: ${path.resolve(missingPath)}`,
    );
    expect(result.projectType).toBe("unknown");
  });

  it("returns ENOTDIR for a file path", () => {
    const root = fixture(["file.txt"]);
    const filePath = path.join(root, "file.txt");

    const result = scanRepo(filePath);

    expect(result.error).toBe(
      `ENOTDIR: path is not a directory: ${path.resolve(filePath)}`,
    );
    expect(result.projectType).toBe("unknown");
  });

  it("checks only the root directory", () => {
    const root = fixture([]);
    fs.mkdirSync(path.join(root, "nested"));
    fs.writeFileSync(path.join(root, "nested", "package.json"), "");

    const result = scanRepo(root);

    expect(result.projectType).toBe("unknown");
    expect(result.detectedFiles).toEqual([]);
  });
});

function fixture(fileNames: string[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "devdoctor-repo-"));
  tempRoots.push(root);

  for (const fileName of fileNames) {
    fs.writeFileSync(path.join(root, fileName), "");
  }

  return root;
}
