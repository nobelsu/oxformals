"use client";

import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import type { RequestType } from "@/lib/data/types";
import { REQUEST_TYPE_TAG_CLASS } from "@/lib/swap/typeTagStyles";

type Props = {
  open: boolean;
  onClose: () => void;
  college: string;
  onChoose: (requestType: RequestType) => void;
};

export function RequestTypeChooserModal({
  open,
  onClose,
  college,
  onChoose,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title={`Request for ${college}`}>
      <p className="mb-4 text-sm text-[var(--ink-muted)]">
        This listing accepts swap or pay requests. How would you like to join?
      </p>
      <div className="flex gap-2">
        <Chip
          appearance="plain"
          className={REQUEST_TYPE_TAG_CLASS.swap}
          onClick={() => {
            onChoose("swap");
            onClose();
          }}
        >
          Swap
        </Chip>
        <Chip
          appearance="plain"
          className={REQUEST_TYPE_TAG_CLASS.pay}
          onClick={() => {
            onChoose("pay");
            onClose();
          }}
        >
          Pay
        </Chip>
      </div>
    </Modal>
  );
}
