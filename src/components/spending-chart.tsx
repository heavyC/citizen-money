import type { CategorySpending } from "@/lib/finance";

const CATEGORICAL_SLOTS = [
  { light: "#2a78d6", dark: "#3987e5" },
  { light: "#eb6834", dark: "#d95926" },
  { light: "#1baf7a", dark: "#199e70" },
  { light: "#eda100", dark: "#c98500" },
  { light: "#e87ba4", dark: "#d55181" },
  { light: "#008300", dark: "#008300" },
  { light: "#4a3aa7", dark: "#9085e9" },
  { light: "#e34948", dark: "#e66767" },
];

const MAX_SLOTS = CATEGORICAL_SLOTS.length;

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function SpendingChart({ data }: { data: CategorySpending[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No spending in this period yet.</p>;
  }

  const top = data.slice(0, MAX_SLOTS - 1);
  const rest = data.slice(MAX_SLOTS - 1);
  const otherTotal = rest.reduce((sum, d) => sum + d.total, 0);
  const rows = rest.length > 0 ? [...top, { category: "Other", total: otherTotal }] : top;
  const max = Math.max(...rows.map((r) => r.total));

  return (
    <div className="viz-root flex flex-col gap-3">
      <style>{`
        .viz-root { color-scheme: light; }
        .viz-bar { background-color: var(--series-light); }
        @media (prefers-color-scheme: dark) {
          :root:where(:not([data-theme="light"])) .viz-root { color-scheme: dark; }
          :root:where(:not([data-theme="light"])) .viz-bar { background-color: var(--series-dark); }
        }
        :root[data-theme="dark"] .viz-root { color-scheme: dark; }
        :root[data-theme="dark"] .viz-bar { background-color: var(--series-dark); }
      `}</style>
      {rows.map((row, i) => {
        const pct = max > 0 ? (row.total / max) * 100 : 0;
        const slot = CATEGORICAL_SLOTS[i];
        return (
          <div key={row.category} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-sm text-foreground">{row.category}</span>
            <div className="h-4 flex-1 rounded-full bg-muted">
              <div
                className="viz-bar h-4 rounded-full"
                style={
                  {
                    width: `${pct}%`,
                    "--series-light": slot.light,
                    "--series-dark": slot.dark,
                  } as React.CSSProperties
                }
                title={`${row.category}: ${formatCurrency(row.total)}`}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
              {formatCurrency(row.total)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
