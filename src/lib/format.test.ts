import { describe, expect, it } from "vitest";
import { formatAmount, money, parseAmount } from "./format";

describe("Argentine amount formatting", () => {
  it("formats money with explicit currency and Argentine separators", () => {
    expect(money(3000000, "ARS")).toBe("ARS 3.000.000");
    expect(money(12500, "USD")).toBe("USD 12.500");
    expect(money(1250.5, "ARS")).toBe("ARS 1.250,50");
  });

  it("formats inputs on blur without currency", () => {
    expect(formatAmount(3000000)).toBe("3.000.000");
    expect(formatAmount(1250.5)).toBe("1.250,50");
  });

  it("parses Argentine formatted values back into numbers", () => {
    expect(parseAmount("3.000.000")).toBe(3000000);
    expect(parseAmount("1.250,50")).toBe(1250.5);
    expect(parseAmount("1250,50")).toBe(1250.5);
  });
});
