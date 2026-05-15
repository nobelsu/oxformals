"use client";

import { Chip } from "@/components/ui/Chip";
import type { RequestType } from "@/lib/data/types";
import { REQUEST_TYPE_TAG_CLASS } from "@/lib/swap/typeTagStyles";

const LABELS: Record<RequestType, string> = {
  swap: "Swap",
  pay: "Pay",
};

type Props = {
  requestType: RequestType;
  className?: string;
};

export function RequestTypeTag({ requestType, className }: Props) {
  return (
    <Chip
      size="sm"
      as="span"
      appearance="plain"
      className={`${REQUEST_TYPE_TAG_CLASS[requestType]} ${className ?? ""}`.trim()}
    >
      {LABELS[requestType]}
    </Chip>
  );
}
