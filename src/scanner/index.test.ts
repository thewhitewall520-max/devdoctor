import { describe, expect, it } from "vitest";

import { initializeScanner } from "./index.js";

describe("initializeScanner", () => {
  it("returns scaffold scan state without running detectors", () => {
    const result = initializeScanner({ repositoryPath: "." });

    expect(result.initialized).toBe(true);
    expect(result.repositoryPath).toBe(process.cwd());
  });
});
