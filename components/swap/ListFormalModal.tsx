"use client";

import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Modal } from "@/components/ui/Modal";
import { ListFormalForm } from "./ListFormalForm";

/** The "List a formal" form in a modal; closes itself once the listing is made. */
export function ListFormalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { createListing } = useData();
  if (!user) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      panelClassName="!max-w-[min(48rem,calc(100vw-1.5rem))]"
      bodyScrollable={false}
    >
      <ListFormalForm
        embedded
        profile={{
          college: user.college,
          year: user.year,
          role: user.role,
        }}
        onSubmit={(input) => {
          const created = createListing(input);
          if (created) onClose();
        }}
      />
    </Modal>
  );
}
