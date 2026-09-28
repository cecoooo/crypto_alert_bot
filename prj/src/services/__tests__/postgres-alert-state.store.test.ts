import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn()
}));

vi.mock("../../config/env.js", () => ({
  env: {
    telegramChatId: "123456789"
  }
}));

import { PostgresAlertStateStore } from "../postgres-alert-state.store.js";

function createPoolMock() {
  const client = {
    query: mocks.query,
    release: vi.fn()
  };

  const pool = {
    query: vi.fn(),
    connect: vi.fn().mockResolvedValue(client)
  };

  return {
    client,
    pool
  };
}

describe("PostgresAlertStateStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads triggered rule IDs for the configured chat", async () => {
    const { pool } = createPoolMock();

    pool.query.mockResolvedValue({
      rowCount: 2,
      rows: [
        { rule_id: "btc-below-86000" },
        { rule_id: "eth-above-3000" }
      ]
    });

    const store = new PostgresAlertStateStore(pool as never);

    await expect(store.load()).resolves.toEqual(
      new Set(["btc-below-86000", "eth-above-3000"])
    );

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("SELECT rule_id"),
      ["123456789"]
    );
  });

  it("returns an empty state when loading from PostgreSQL fails", async () => {
    const { pool } = createPoolMock();

    pool.query.mockRejectedValue(new Error("Database unavailable"));

    const store = new PostgresAlertStateStore(pool as never);

    await expect(store.load()).resolves.toEqual(new Set());
  });

  it("replaces the stored state in one committed transaction", async () => {
    const { client, pool } = createPoolMock();

    client.query.mockResolvedValue({});

    const store = new PostgresAlertStateStore(pool as never);

    await store.save(
      new Set(["btc-below-86000", "eth-above-3000"])
    );

    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("DELETE FROM alert_states"),
      ["123456789"]
    );
    expect(client.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("INSERT INTO alert_states"),
      ["123456789", "btc-below-86000"]
    );
    expect(client.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("INSERT INTO alert_states"),
      ["123456789", "eth-above-3000"]
    );
    expect(client.query).toHaveBeenNthCalledWith(5, "COMMIT");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("clears the stored state without inserts when the state is empty", async () => {
    const { client, pool } = createPoolMock();

    client.query.mockResolvedValue({});

    const store = new PostgresAlertStateStore(pool as never);

    await store.save(new Set());

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("DELETE FROM alert_states"),
      ["123456789"]
    );
    expect(client.query).toHaveBeenNthCalledWith(3, "COMMIT");
    expect(client.query).toHaveBeenCalledTimes(3);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back and releases the client when saving fails", async () => {
    const { client, pool } = createPoolMock();

    client.query
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("Delete failed"))
      .mockResolvedValueOnce({});

    const store = new PostgresAlertStateStore(pool as never);

    await expect(
      store.save(new Set(["btc-below-86000"]))
    ).resolves.toBeUndefined();

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("DELETE FROM alert_states"),
      ["123456789"]
    );
    expect(client.query).toHaveBeenNthCalledWith(3, "ROLLBACK");
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});