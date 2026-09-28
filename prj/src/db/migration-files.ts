import { readdir } from "node:fs/promises";

export async function getMigrationFiles(
  migrationsDirectory: string
): Promise<string[]> {
  const directoryEntries = await readdir(migrationsDirectory, {
    withFileTypes: true
  });

  return directoryEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}