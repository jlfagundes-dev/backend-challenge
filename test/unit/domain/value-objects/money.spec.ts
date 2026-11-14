import { describe, expect, test } from "bun:test";
import { Money } from "../../../../src/domain/value-objects/money";

describe("Money", () => {
  test("creates and serializes a monetary value", () => {
    const money = Money.from({ amount: "25.00", currency: "BRL" });

    expect(money.toJSON()).toEqual({ amount: "25.00", currency: "BRL" });
    expect(money.toString()).toBe("25.00");
  });

  test("normalizes values to two decimal places", () => {
    expect(Money.from({ amount: "25", currency: "BRL" }).toString()).toBe("25.00");
  });

  test("creates zero with the requested currency", () => {
    expect(Money.zero("BRL").toJSON()).toEqual({ amount: "0.00", currency: "BRL" });
  });

  test.each(["", "-1.00", "1.001", "1e2"])(
    "rejects invalid amount %s",
    (amount) => {
      expect(() => Money.from({ amount, currency: "BRL" })).toThrow();
    },
  );

  test("rejects invalid currency codes", () => {
    expect(() => Money.from({ amount: "10.00", currency: "brl" })).toThrow();
  });

  test("performs immutable arithmetic", () => {
    const original = Money.from({ amount: "10.00", currency: "BRL" });
    const result = original.add(Money.from({ amount: "2.50", currency: "BRL" }));

    expect(original.toString()).toBe("10.00");
    expect(result.toString()).toBe("12.50");
  });

  test("rejects arithmetic with different currencies", () => {
    const brl = Money.from({ amount: "10.00", currency: "BRL" });
    const usd = Money.from({ amount: "1.00", currency: "USD" });

    expect(() => brl.add(usd)).toThrow();
  });
});