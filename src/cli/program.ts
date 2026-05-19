import { Command } from "commander";

import { formatReport } from "../report/index.js";
import { runDiagnosticScan } from "../scanner/index.js";
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
    .description("Scan a repository")
    .argument("[path]", "Repository path", process.cwd())
    .action(async (repositoryPath: string) => {
      try {
        const result = await runDiagnosticScan(repositoryPath);
        program.optsWithGlobals();
        console.log(
          formatReport(result.report, {
            rootPath: result.rootPath,
            noColor: process.env.NO_COLOR !== undefined,
          }),
        );
        process.exitCode = result.report.issues.some((issue) => {
          return issue.severity === "critical";
        })
          ? 1
          : 0;
      } catch (error) {
        process.exitCode = 2;
        console.error(`扫描失败：${errorMessage(error)}`);
      }
    });

  return program;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "未知错误";
}
