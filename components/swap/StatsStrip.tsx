import { SketchCard } from "@/components/ui/SketchCard";

type Props = {
  openSwaps: number;
};

export function StatsStrip({ openSwaps }: Props) {
  return (
    <section className="flex justify-center">
      <SketchCard
        seed={2}
        padded={false}
        className="mx-auto w-full max-w-xs px-6 py-5 text-center"
      >
        <div className="text-5xl leading-none">{openSwaps}</div>
        <div className="mt-2 text-sm uppercase tracking-wider text-[var(--ink-muted)]">
          open swaps
        </div>
      </SketchCard>
    </section>
  );
}
