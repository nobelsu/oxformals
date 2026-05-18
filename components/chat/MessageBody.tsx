import Link from "next/link";
import type { ChatMention } from "@/lib/chat/types";
import { segmentMessageBody } from "@/lib/chat/mentions";

type Props = {
  body: string;
  mentions?: ChatMention[];
  isMine?: boolean;
};

export function MessageBody({ body, mentions, isMine = false }: Props) {
  const segments = segmentMessageBody(body, mentions);
  const mentionClassName = isMine
    ? "font-semibold text-white underline underline-offset-2 hover:text-white/90"
    : "font-semibold text-[var(--accent)] underline underline-offset-2 hover:text-[var(--accent-hover)]";

  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.text}</span>;
        }
        return (
          <Link
            key={index}
            href={`/profile/${segment.userId}`}
            className={mentionClassName}
          >
            @{segment.label}
          </Link>
        );
      })}
    </p>
  );
}
