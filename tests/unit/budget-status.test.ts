import { describe, expect, it } from "vitest";
import { computeBudgetStatus } from "@/lib/budget-status";

describe("computeBudgetStatus", () => {
  it("is on track under 80%", () => {
    expect(computeBudgetStatus(40, 100)).toEqual({ pct: 40, barWidth: 40, label: "on track" });
  });

  it("is near limit at 80-99%", () => {
    expect(computeBudgetStatus(85, 100)).toEqual({ pct: 85, barWidth: 85, label: "near limit" });
  });

  it("is over budget at or above 100%, with bar width capped at 100", () => {
    expect(computeBudgetStatus(150, 100)).toEqual({ pct: 150, barWidth: 100, label: "over budget" });
  });

  it("treats a zero limit as 0%", () => {
    expect(computeBudgetStatus(50, 0)).toEqual({ pct: 0, barWidth: 0, label: "on track" });
  });
});
