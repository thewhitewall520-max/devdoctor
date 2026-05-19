import { describe, expect, it } from "vitest";

import {
  DEFAULT_PORTS,
  inspectPorts,
  type PortProbe,
} from "./ports.js";

describe("inspectPorts", () => {
  it("marks a free port as free", async () => {
    const result = await inspectPorts(".", {
      ports: [3000],
      probePort: probe({ 3000: "free" }),
    });

    expect(result.checkedPorts).toEqual([
      {
        port: 3000,
        occupied: false,
        protocol: "tcp",
        likelyService: "Node.js dev server",
        warning: null,
      },
    ]);
    expect(result.freePorts.map((port) => port.port)).toEqual([3000]);
    expect(result.occupiedPorts).toEqual([]);
  });

  it("marks an occupied port as occupied", async () => {
    const result = await inspectPorts(".", {
      ports: [5432],
      probePort: probe({ 5432: "occupied" }),
    });

    expect(result.occupiedPorts).toEqual([
      {
        port: 5432,
        occupied: true,
        protocol: "tcp",
        likelyService: "PostgreSQL",
        warning: null,
      },
    ]);
    expect(result.freePorts).toEqual([]);
  });

  it("checks multiple ports", async () => {
    const result = await inspectPorts(".", {
      ports: [3000, 5173, 6379],
      probePort: probe({ 3000: "free", 5173: "occupied", 6379: "free" }),
    });

    expect(result.checkedPorts.map((port) => port.port)).toEqual([
      3000, 5173, 6379,
    ]);
    expect(result.freePorts.map((port) => port.port)).toEqual([3000, 6379]);
    expect(result.occupiedPorts.map((port) => port.port)).toEqual([5173]);
  });

  it("skips unknown ports gracefully", async () => {
    const calls: number[] = [];

    const result = await inspectPorts(".", {
      ports: [12345],
      probePort: async (port) => {
        calls.push(port);
        return { status: "free" };
      },
    });

    expect(calls).toEqual([]);
    expect(result.checkedPorts).toEqual([]);
    expect(result.error).toBe("No known ports to inspect");
    expect(result.warnings).toEqual(["No known ports to inspect"]);
  });

  it("maps likely services", async () => {
    const result = await inspectPorts(".", {
      ports: [3000, 3001, 5173, 8000, 8080, 5432, 3306, 6379, 27017, 11434],
      probePort: probe(Object.fromEntries(DEFAULT_PORTS.map((port) => [port, "free"]))),
    });

    expect(
      Object.fromEntries(
        result.checkedPorts.map((port) => [port.port, port.likelyService]),
      ),
    ).toEqual({
      3000: "Node.js dev server",
      3001: "Node.js dev server (alt)",
      5173: "Vite dev server",
      8000: "Python dev server",
      8080: "HTTP alt server",
      5432: "PostgreSQL",
      3306: "MySQL",
      6379: "Redis",
      27017: "MongoDB",
      11434: "Ollama",
    });
  });

  it("returns a warning for detection failure", async () => {
    const result = await inspectPorts(".", {
      ports: [8080],
      probePort: async () => {
        throw new Error("simulated failure");
      },
    });

    expect(result.checkedPorts).toEqual([
      {
        port: 8080,
        occupied: false,
        protocol: "tcp",
        likelyService: "HTTP alt server",
        warning: "Port 8080 probe failed: simulated failure",
      },
    ]);
    expect(result.warnings).toEqual(["Port 8080 probe failed: simulated failure"]);
  });

  it("only probes localhost", async () => {
    const hosts: string[] = [];

    await inspectPorts(".", {
      ports: [3000],
      probePort: async (_port, options) => {
        hosts.push(options.host);
        return { status: "free" };
      },
    });

    expect(hosts).toEqual(["127.0.0.1"]);
  });

  it("does not invoke kill commands", async () => {
    const commands: string[] = [];

    await inspectPorts(".", {
      ports: [3000],
      probePort: async () => {
        commands.push("probe");
        return { status: "occupied" };
      },
    });

    expect(commands).not.toContain("kill");
    expect(commands).not.toContain("taskkill");
  });

  it("does not modify config", async () => {
    const result = await inspectPorts("/tmp/some-project", {
      ports: [3000],
      probePort: probe({ 3000: "free" }),
    });

    expect(result.rootPath).toBe("/tmp/some-project");
    expect(result.error).toBeNull();
  });

  it("does not scan beyond the known common ports", async () => {
    const calls: number[] = [];

    await inspectPorts(".", {
      ports: [3000, 12345, 11434, 65535],
      probePort: async (port) => {
        calls.push(port);
        return { status: "free" };
      },
    });

    expect(calls).toEqual([3000, 11434]);
    expect(
      calls.every((port) => (DEFAULT_PORTS as readonly number[]).includes(port)),
    ).toBe(true);
  });

  it("uses the default timeout", async () => {
    const timeouts: number[] = [];

    await inspectPorts(".", {
      ports: [3000],
      probePort: async (_port, options) => {
        timeouts.push(options.timeoutMs);
        return { status: "free" };
      },
    });

    expect(timeouts).toEqual([500]);
  });
});

function probe(states: Record<number, "free" | "occupied">): PortProbe {
  return async (port) => {
    const state = states[port] ?? "free";
    return { status: state };
  };
}
