import { formatUnreadCount } from "@/lib/chat/unread";

type Props = {
  count: number;
  className?: string;
};

export function UnreadBadge({ count, className = "" }: Props) {
  if (count <= 0) return null;
  const label = formatUnreadCount(count);
  return (
    <span
      className={`inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[0.65rem] font-semibold leading-none text-[var(--accent-ink)] ${className}`}
      aria-label={`${count} unread`}
    >
      {label}
    </span>
  );
}
