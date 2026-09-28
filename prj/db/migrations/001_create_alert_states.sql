CREATE TABLE IF NOT EXISTS alert_states (
  chat_id BIGINT NOT NULL,
  rule_id TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chat_id, rule_id)
);