import { describe, expect, it } from "vitest";

import { formatScanResult } from "./index.js";

describe("formatScanResult", () => {
  it("formats the scaffold scan output", () => {
    expect(
      formatScanResult({
        repositoryPath: "/repo",
        initialized: true,
      }),
    ).toBe(
      [
        "DevDoctor v0.1",
        "Scanning repository...",
        "Repository path: /repo",
        "Scanner initialized.",
      ].join("\n"),
    );
  });
});
