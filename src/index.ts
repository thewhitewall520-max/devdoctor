import { createCliProgram } from "./cli/program.js";

export async function main(argv: string[] = process.argv): Promise<void> {
  const program = createCliProgram();
  await program.parseAsync(argv);
}

export { createCliProgram } from "./cli/program.js";
