import { SketchCard } from "@/components/ui/SketchCard";

type Props = {
  people: number;
  openSwaps: number;
  colleges: number;
};

export function StatsStrip({ people, openSwaps, colleges }: Props) {
  const items = [
    { label: "people", value: people, seed: 1 },
    { label: "open swaps", value: openSwaps, seed: 2 },
    { label: "colleges", value: colleges, seed: 3 },
  ];
  return (
    <section className="grid grid-cols-3 gap-3 sm:gap-4">
      {items.map((i) => (
        <SketchCard key={i.label} seed={i.seed} padded={false} className="px-5 py-4">
          <div className="text-4xl leading-none">{i.value}</div>
          <div className="mt-1 text-sm text-[var(--ink-muted)] uppercase tracking-wider">
            {i.label}
          </div>
        </SketchCard>
      ))}
    </section>
  );
}
