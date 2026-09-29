import { FeedSkeleton, Skeleton } from "@/components/ui/Loading";

/** Shown straight away while a page's server render is on its way. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-8 sm:px-6">
      <Skeleton className="h-8 w-1/3" />
      <FeedSkeleton count={3} />
    </main>
  );
}
