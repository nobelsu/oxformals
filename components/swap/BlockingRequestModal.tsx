"use client";

import { Modal } from "@/components/ui/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  hasAccepted: boolean;
  onViewRequests: () => void;
};

export function BlockingRequestModal({
  open,
  onClose,
  hasAccepted,
  onViewRequests,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="One request at a time"
      panelClassName="max-w-sm"
    >
      <p className="mb-6 text-sm leading-relaxed text-[var(--ink-muted)]">
        {hasAccepted
          ? "You're already in for this formal."
          : "You already asked. Withdraw it to send another."}
      </p>
      <button
        type="button"
        onClick={() => {
          onClose();
          onViewRequests();
        }}
        className="w-full cursor-pointer rounded-full bg-[var(--accent)] px-8 py-3 text-sm text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
      >
        View my requests
      </button>
    </Modal>
  );
}
