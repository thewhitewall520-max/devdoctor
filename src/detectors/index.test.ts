import { describe, expect, it } from "vitest";

import { createDetectorRegistry } from "./index.js";

describe("createDetectorRegistry", () => {
  it("starts empty for the scaffold", () => {
    expect(createDetectorRegistry()).toEqual({ count: 0 });
  });
});
