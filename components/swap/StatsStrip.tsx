type Props = {
  openSwaps: number;
};

export function StatsStrip({ openSwaps }: Props) {
  return (
    <section className="flex shrink-0 items-center justify-center">
      <p className="text-sm text-[var(--ink-muted)]">
        ({openSwaps} open swaps)
      </p>
    </section>
  );
}
