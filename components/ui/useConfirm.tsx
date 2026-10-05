"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

type Ask = {
  message: string;
  confirmLabel: string;
  action: () => void | Promise<void>;
};

/**
 * "Are you sure?" for actions that can't be undone. Call `confirm` from the
 * button and render `dialog` once in the component.
 */
export function useConfirm(): {
  confirm: (message: string, confirmLabel: string, action: Ask["action"]) => void;
  dialog: ReactNode;
} {
  const [ask, setAsk] = useState<Ask | null>(null);
  const confirm = useCallback(
    (message: string, confirmLabel: string, action: Ask["action"]) =>
      setAsk({ message, confirmLabel, action }),
    [],
  );
  const dialog = (
    <ConfirmDialog
      open={ask !== null}
      message={ask?.message ?? ""}
      confirmLabel={ask?.confirmLabel}
      variant="destructive"
      onCancel={() => setAsk(null)}
      onConfirm={() => {
        const action = ask?.action;
        setAsk(null);
        void action?.();
      }}
    />
  );
  return { confirm, dialog };
}
