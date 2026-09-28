import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { getMigrationFiles } from "../migration-files.js";

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "crypto-alert-bot-migrations-")
  );

  temporaryDirectories.push(directory);

  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await import("node:fs/promises").then(({ rm }) =>
        rm(directory, { recursive: true, force: true })
      );
    })
  );
});

describe("getMigrationFiles", () => {
  it("returns only SQL files sorted by filename", async () => {
    const directory = await createTemporaryDirectory();

    await writeFile(
      path.join(directory, "010_add_alert_events.sql"),
      "SELECT 1;"
    );
    await writeFile(
      path.join(directory, "001_create_alert_states.sql"),
      "SELECT 1;"
    );
    await writeFile(path.join(directory, "notes.txt"), "ignore me");
    await mkdir(path.join(directory, "nested.sql"));

    await expect(getMigrationFiles(directory)).resolves.toEqual([
      "001_create_alert_states.sql",
      "010_add_alert_events.sql"
    ]);
  });

  it("returns an empty list when the directory has no SQL files", async () => {
    const directory = await createTemporaryDirectory();

    await writeFile(path.join(directory, "README.md"), "No migrations yet.");

    await expect(getMigrationFiles(directory)).resolves.toEqual([]);
  });
});