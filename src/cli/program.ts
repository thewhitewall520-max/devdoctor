import { Command } from "commander";

import { formatScanResult } from "../report/index.js";
import { initializeScanner } from "../scanner/index.js";
import { VERSION } from "../utils/version.js";

export function createCliProgram(): Command {
  const program = new Command();

  program
    .name("devdoctor")
    .description("DevDoctor CLI")
    .version(VERSION, "-V, --version", "Show version")
    .helpOption("-h, --help", "Show help");

  program
    .command("scan")
    .description("Initialize a repository scan")
    .argument("[path]", "Repository path", process.cwd())
    .action((repositoryPath: string) => {
      const result = initializeScanner({ repositoryPath });
      program.optsWithGlobals();
      console.log(formatScanResult(result));
    });

  return program;
}
