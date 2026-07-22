import { describe, expect, it } from "vitest";
import { foldIntoTopCategories } from "@/components/spending-chart";
import type { CategorySpending } from "@/lib/finance";

function cats(n: number, offset = 0): CategorySpending[] {
  return Array.from({ length: n }, (_, i) => ({ category: `Cat${i + offset}`, total: 100 - i }));
}

describe("foldIntoTopCategories", () => {
  it("passes data through unchanged when under the slot limit", () => {
    const data = cats(3);
    expect(foldIntoTopCategories(data, 8)).toEqual(data);
  });

  it("folds overflow into a synthetic Other row when none exists", () => {
    const data = cats(10);
    const rows = foldIntoTopCategories(data, 8);
    expect(rows).toHaveLength(8);
    expect(rows[7].category).toBe("Other");
    expect(rows[7].total).toBeCloseTo(data.slice(7).reduce((s, d) => s + d.total, 0), 2);
  });

  it("merges overflow into a real 'Other' category instead of duplicating the row", () => {
    const data: CategorySpending[] = [
      { category: "Groceries", total: 500 },
      { category: "Restaurants", total: 400 },
      { category: "Coffee Shops", total: 300 },
      { category: "Shopping", total: 200 },
      { category: "Travel", total: 150 },
      { category: "Transportation", total: 120 },
      { category: "Other", total: 100 },
      { category: "Utilities", total: 90 },
      { category: "Insurance", total: 80 },
    ];

    const rows = foldIntoTopCategories(data, 8);
    const categories = rows.map((r) => r.category);

    expect(categories.filter((c) => c === "Other")).toHaveLength(1);
    const otherRow = rows.find((r) => r.category === "Other");
    expect(otherRow?.total).toBeCloseTo(100 + 90 + 80, 2);
  });
});
