export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </div>
  );
}
