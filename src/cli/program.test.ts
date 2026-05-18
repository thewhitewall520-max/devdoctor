import { describe, expect, it, vi } from "vitest";

import { createCliProgram } from "./program.js";

describe("createCliProgram", () => {
  it("prints scaffold output for scan", async () => {
    const output = await runCli(["node", "devdoctor", "scan"]);

    expect(output).toContain("DevDoctor v0.1");
    expect(output).toContain("Scanning repository...");
    expect(output).toContain(`Repository path: ${process.cwd()}`);
    expect(output).toContain("Scanner initialized.");
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

function isCommanderHelpOrVersionExit(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "commander.helpDisplayed" ||
      error.code === "commander.version")
  );
}
