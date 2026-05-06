"use client";

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { ProfileEditor } from "./ProfileEditor";
import { WishlistChips } from "./WishlistChips";

export function MineTab() {
  const { user } = useAuth();
  const { wishlist, saveWishlist } = useData();
  const [profileDirty, setProfileDirty] = useState(false);
  const [wishlistDirty, setWishlistDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileSave, setProfileSave] = useState<(() => Promise<void>) | null>(null);
  const [wishlistSave, setWishlistSave] = useState<(() => Promise<void>) | null>(null);
  const registerProfileSave = useCallback((saveFn: () => Promise<void>) => {
    setProfileSave(() => saveFn);
  }, []);
  const registerWishlistSave = useCallback((saveFn: () => Promise<void>) => {
    setWishlistSave(() => saveFn);
  }, []);

  const hasUnsavedChanges = useMemo(
    () => profileDirty || wishlistDirty,
    [profileDirty, wishlistDirty],
  );

  const handleSaveAll = useCallback(async () => {
    if (!hasUnsavedChanges || saving) return;
    setSaving(true);
    try {
      await profileSave?.();
      await wishlistSave?.();
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } finally {
      setSaving(false);
    }
  }, [hasUnsavedChanges, saving, profileSave, wishlistSave]);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-10">
      <ProfileEditor
        onDirtyChange={setProfileDirty}
        registerSave={registerProfileSave}
      />

      <WishlistChips
        selected={wishlist}
        onSave={saveWishlist}
        onDirtyChange={setWishlistDirty}
        registerSave={registerWishlistSave}
      />
      {hasUnsavedChanges || saving || saved ? (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            type="button"
            onClick={() => void handleSaveAll()}
            disabled={saving || !hasUnsavedChanges}
            className="cursor-pointer rounded-full bg-[var(--accent)] px-8 py-4 text-base font-semibold text-white ring-1 ring-black/10 shadow-[0_6px_16px_rgba(0,0,0,0.18)] transition-all duration-200 hover:brightness-95 hover:shadow-[0_8px_20px_rgba(0,0,0,0.22)] dark:bg-white dark:text-black dark:ring-white dark:ring-2 dark:shadow-[0_10px_28px_rgba(0,0,0,0.55),0_0_0_2px_rgba(255,255,255,0.25),0_0_22px_rgba(255,255,255,0.2)] dark:hover:bg-neutral-200 dark:hover:brightness-100 dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_0_2px_rgba(255,255,255,0.32),0_0_28px_rgba(255,255,255,0.26)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
