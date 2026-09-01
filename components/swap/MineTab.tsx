"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { ProfileEditor } from "./ProfileEditor";
import { ProfileView } from "./ProfileView";
import { WishlistChips } from "./WishlistChips";

export function MineTab() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { wishlist, saveWishlist } = useData();
  const [profileDirty, setProfileDirty] = useState(false);
  const [wishlistDirty, setWishlistDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileSave, setProfileSave] = useState<(() => Promise<void>) | null>(
    null,
  );
  const [profileCancel, setProfileCancel] = useState<(() => void) | null>(null);
  const [wishlistSave, setWishlistSave] = useState<(() => Promise<void>) | null>(
    null,
  );

  useEffect(() => {
    if (searchParams.get("edit") !== "1") return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  }, [router, searchParams]);

  const registerProfileSave = useCallback((saveFn: () => Promise<void>) => {
    setProfileSave(() => saveFn);
  }, []);
  const registerProfileCancel = useCallback((cancelFn: () => void) => {
    setProfileCancel(() => cancelFn);
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
    <div className="flex flex-col gap-8 pb-28">
      <ProfileEditor
        onDirtyChange={setProfileDirty}
        registerSave={registerProfileSave}
        registerCancel={registerProfileCancel}
      />

      <WishlistChips
        selected={wishlist}
        onSave={saveWishlist}
        onDirtyChange={setWishlistDirty}
        registerSave={registerWishlistSave}
      />

      <ProfileView userId={user.id} embedded omitCard />

      {hasUnsavedChanges || saving || saved ? (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => profileCancel?.()}
            disabled={saving || !profileDirty}
            className="cursor-pointer rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-6 py-3.5 text-base font-semibold text-[var(--ink)] shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-200 hover:bg-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSaveAll()}
            disabled={saving || !hasUnsavedChanges}
            className="cursor-pointer rounded-full bg-[var(--accent)] px-8 py-4 text-base font-semibold text-[var(--accent-ink)] ring-1 ring-[color-mix(in_srgb,var(--ink)_12%,transparent)] shadow-[0_6px_16px_rgba(0,0,0,0.18)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
