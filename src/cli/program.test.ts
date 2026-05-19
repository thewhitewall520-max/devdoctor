import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createCliProgram } from "./program.js";

const tempRoots: string[] = [];

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

describe("createCliProgram", () => {
  it("prints a real diagnostic report for scan", async () => {
    const root = fixture({});
    const output = await runCli(["node", "devdoctor", "scan", root]);

    expect(output).toContain("DevDoctor v0.1");
    expect(output).toContain(`Scanning repository: ${root}`);
    expect(output).not.toContain("Scanner initialized.");
  });

  it("prints help with the scan command", async () => {
    const output = await runCli(["node", "devdoctor", "--help"]);

    expect(output).toContain("Usage: devdoctor [options] [command]");
    expect(output).toContain("scan");
  });

  it("prints version", async () => {
    const output = await runCli(["node", "devdoctor", "--version"]);

    expect(output.trim()).toBe("0.1.0");
  });
});

async function runCli(argv: string[]): Promise<string> {
  const program = createCliProgram();
  const writes: string[] = [];

  program.exitOverride();
  program.configureOutput({
    writeOut: (value) => writes.push(value),
    writeErr: (value) => writes.push(value),
  });

  const log = vi.spyOn(console, "log").mockImplementation((value) => {
    writes.push(String(value));
  });

  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (!isCommanderHelpOrVersionExit(error)) {
      throw error;
    }
  } finally {
    log.mockRestore();
  }

  return writes.join("");
}

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "devdoctor-cli-"));
  tempRoots.push(root);

  for (const [fileName, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(root, fileName), contents);
  }

  return root;
}

function isCommanderHelpOrVersionExit(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "commander.helpDisplayed" ||
      error.code === "commander.version")
  );
}
