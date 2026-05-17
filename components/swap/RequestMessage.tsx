"use client";

import { useLayoutEffect, useRef, useState } from "react";

type Props = {
  message: string;
};

export function RequestMessage({ message }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [message, expanded]);

  const showToggle = clamped || expanded;

  return (
    <div>
      <p
        ref={textRef}
        className={`text-sm italic leading-relaxed text-[var(--ink-soft)] break-words ${
          expanded ? "" : "line-clamp-2"
        }`}
      >
        &ldquo;{message}&rdquo;
      </p>
      {showToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-xs text-[var(--ink-muted)] underline underline-offset-2 hover:text-[var(--ink)]"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}
