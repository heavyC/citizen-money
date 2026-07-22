function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Calendar-month range (first day to last day), `monthsAgo` months back from today. */
export function monthRange(monthsAgo: number): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const to = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);
  return { from: isoDate(from), to: isoDate(to) };
}

export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
