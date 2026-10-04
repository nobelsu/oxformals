/**
 * Loading states: shimmering skeletons shaped like the content that's coming,
 * and three bouncing dots for small spots and busy buttons. Both calm down
 * under prefers-reduced-motion (see globals.css).
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`skeleton block rounded-lg ${className}`} />;
}

/** A column of rows: optional avatar circle, a title bar and a shorter line. */
export function SkeletonRows({
  count = 3,
  avatar = true,
  className = "",
}: {
  count?: number;
  avatar?: boolean;
  className?: string;
}) {
  return (
    <div role="status" aria-label="Loading" className={`flex flex-col gap-4 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          {avatar ? <Skeleton className="h-10 w-10 shrink-0 rounded-full" /> : null}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className={`h-3 ${i % 2 ? "w-1/2" : "w-2/3"}`} />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Feed-shaped: avatar + headline, then a card. */
export function FeedSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="mt-3 flex flex-col gap-7">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
          <Skeleton className="h-28 w-full rounded-[18px]" />
        </div>
      ))}
    </div>
  );
}

export function LoadingDots({ className = "" }: { className?: string }) {
  return (
    // One line tall, so a button that swaps its label for the dots keeps its height.
    <span
      role="status"
      aria-label="Loading"
      className={`inline-flex h-[1lh] items-center gap-1.5 ${className}`}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          className="loading-dot h-2 w-2 rounded-full bg-current"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

/** Dots centred in a padded block, for panels and modals. */
export function LoadingBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-center py-8 text-[var(--accent)] ${className}`}>
      <LoadingDots />
    </div>
  );
}
