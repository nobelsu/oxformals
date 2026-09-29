"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { ProfileEditor } from "./ProfileEditor";
import { ProfileView } from "./ProfileView";
import { WishlistChips } from "./WishlistChips";
import { LoadingDots } from "@/components/ui/Loading";

export function MineTab() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlEditing = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(urlEditing);
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
    setEditing(urlEditing);
  }, [urlEditing]);

  const setEditingMode = useCallback(
    (next: boolean) => {
      setEditing(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "mine");
      if (next) {
        params.set("edit", "1");
      } else {
        params.delete("edit");
      }
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [router, searchParams],
  );

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
    } catch {
      // The editor shows why it didn't save; just don't claim "Saved".
    } finally {
      setSaving(false);
    }
  }, [hasUnsavedChanges, saving, profileSave, wishlistSave]);

  const exitEditMode = useCallback(() => {
    if (hasUnsavedChanges) {
      const discard = window.confirm(
        "Discard unsaved changes and return to your profile?",
      );
      if (!discard) return;
      profileCancel?.();
    }
    setEditingMode(false);
  }, [hasUnsavedChanges, profileCancel, setEditingMode]);

  if (!user) return null;

  if (!editing) {
    return (
      <ProfileView
        userId={user.id}
        embedded
        onEditProfile={() => setEditingMode(true)}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-16">
      <div className="sticky top-[4.25rem] z-30 -mx-2 flex items-center justify-between gap-3 rounded-full bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-2 py-2 backdrop-blur-md">
        <button
          type="button"
          onClick={exitEditMode}
          className="cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          {profileDirty && !saving ? (
            <button
              type="button"
              onClick={() => profileCancel?.()}
              className="cursor-pointer rounded-full px-3 py-1.5 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSaveAll()}
            disabled={saving || !hasUnsavedChanges}
            className="inline-flex min-w-[5.5rem] cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] px-5 py-1.5 text-sm font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <LoadingDots /> : saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
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
    </div>
  );
}
