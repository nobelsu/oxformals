"use client";

import { Modal } from "@/components/ui/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  pendingCount: number;
  onViewRequests: () => void;
};

export function EditListingBlockedModal({
  open,
  onClose,
  pendingCount,
  onViewRequests,
}: Props) {
  const label = pendingCount === 1 ? "request" : "requests";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Requests still pending"
      panelClassName="max-w-sm"
    >
      <p className="mb-6 text-sm leading-relaxed text-[var(--ink-muted)]">
        You have {pendingCount} pending {label} on this listing. Accept or
        decline them before editing.
      </p>
      <button
        type="button"
        onClick={() => {
          onClose();
          onViewRequests();
        }}
        className="w-full cursor-pointer rounded-full bg-[var(--accent)] px-8 py-3 text-sm text-white transition-colors hover:bg-[var(--accent-hover)]"
      >
        View incoming requests
      </button>
    </Modal>
  );
}
