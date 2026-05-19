import path from "node:path";

export function resolveRepositoryPath(repositoryPath: string): string {
  return path.resolve(repositoryPath);
}
