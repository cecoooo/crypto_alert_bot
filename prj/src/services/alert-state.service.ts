import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export class AlertStateService {
  private readonly stateDirectory = path.join(process.cwd(), "data");
  private readonly stateFilePath = path.join(
    this.stateDirectory,
    "alert-state.json"
  );

  public async load(): Promise<Set<string>> {
    try {
      const content = await readFile(this.stateFilePath, "utf8");
      const savedRuleIds = JSON.parse(content) as string[];

      console.log(`Loaded ${savedRuleIds.length} triggered alert state(s).`);

      return new Set(savedRuleIds);
    } catch (error) {
      const errorCode =
        typeof error === "object" && error !== null && "code" in error
          ? error.code
          : undefined;

      if (errorCode === "ENOENT") {
        console.log(
          "No previous alert state file found. Starting with empty state."
        );

        return new Set<string>();
      }

      console.error("Failed to load alert state:", error);

      return new Set<string>();
    }
  }

  public async save(triggeredRuleIds: Set<string>): Promise<void> {
    try {
      await mkdir(this.stateDirectory, { recursive: true });

      const savedRuleIds = [...triggeredRuleIds];

      await writeFile(
        this.stateFilePath,
        JSON.stringify(savedRuleIds, null, 2),
        "utf8"
      );
    } catch (error) {
      console.error("Failed to save alert state:", error);
    }
  }
}