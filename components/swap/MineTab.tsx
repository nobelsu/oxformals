"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { useOnChange } from "@/lib/hooks/useOnChange";
import { useCallback, useMemo, useState } from "react";
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

  useOnChange(String(urlEditing), () => setEditing(urlEditing));

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
        "Discard changes?",
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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-24">
      <div>
        <button
          type="button"
          onClick={exitEditMode}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
        >
          <ChevronLeftIcon /> Back to profile
        </button>
        <h1 className="mt-2 font-display text-3xl uppercase tracking-wide sm:text-4xl">
          Edit profile
        </h1>
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

      {/* Solid bar pinned to the bottom, only while there is something to save. */}
      {hasUnsavedChanges || saving || saved ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--bg)]">
          <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-0">
            <p className="text-sm text-[var(--ink-muted)]">
              {saved && !hasUnsavedChanges ? "All changes saved" : "Unsaved changes"}
            </p>
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
        </div>
      ) : null}
    </div>
  );
}