import { describe, expect, it } from "vitest";

import { resolveRepositoryPath } from "./path.js";

describe("resolveRepositoryPath", () => {
  it("resolves relative paths from the current working directory", () => {
    expect(resolveRepositoryPath(".")).toBe(process.cwd());
  });
});
