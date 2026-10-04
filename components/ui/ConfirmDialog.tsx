"use client";

import { Modal } from "./Modal";

type ConfirmDialogProps = {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} panelClassName="max-w-sm">
      <p className="text-base leading-relaxed">{message}</p>
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => void onConfirm()}
          className={[
            "rounded-full border-[2px] px-4 py-1.5 text-sm font-medium transition-colors",
            variant === "destructive"
              ? "border-[var(--danger)] bg-[var(--danger)] text-[var(--danger-ink)] hover:bg-[color-mix(in_srgb,var(--danger)_85%,black)] hover:border-[color-mix(in_srgb,var(--danger)_85%,black)]"
              : "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] hover:opacity-80",
          ].join(" ")}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
