export interface AlertStateStore {
  load(): Promise<Set<string>>;
  save(triggeredRuleIds: Set<string>): Promise<void>;
}