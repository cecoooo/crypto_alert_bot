import { vi } from "vitest";

vi.mock("./src/services/price.service.js", () => ({
  fetchPrices: vi.fn(),
  formatPrice: vi.fn((price: number) => `$${price.toFixed(2)}`)
}));

vi.mock("./src/bot/messages.js", () => ({
  createAlertMessage: vi.fn()
}));

vi.mock("./src/config/env.js", () => ({
  env: {
    currency: "usd",
    telegramChatId: "123456789"
  }
}));