"use client";

import { useMutation } from "convex/react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { Chip } from "@/components/ui/Chip";
import { OutlineCombobox } from "@/components/ui/OutlineCombobox";
import { SketchCard } from "@/components/ui/SketchCard";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { normalizeCollegeName } from "@/lib/data/colleges";
import type { NewListingInput } from "@/lib/data/dataClient";
import { GROUP_SIZES, type GroupSize, type ListingType } from "@/lib/data/types";
import {
  isMenuImageContentType,
  MENU_FILE_ACCEPT,
  uploadMenuFile,
} from "@/lib/upload/menuFile";

const LISTING_TYPE_OPTIONS: { value: ListingType; label: string }[] = [
  { value: "swap", label: "Swap" },
  { value: "pay", label: "Pay" },
  { value: "both", label: "Swap or pay" },
];

export type ListingProfileFields = {
  college: string;
  year: string;
  role: string;
};

export type ListingFormValues = {
  dateTime: string;
  groupSize: GroupSize;
  message: string;
  menu: string;
  menuPdfUrl?: string;
  menuFileContentType?: string;
  listingType: ListingType;
  price?: number;
};

type Props = {
  /** Current profile values used to validate before post (same source as createListing). */
  profile: ListingProfileFields;
  /** When true, render only the form (no outer SketchCard) for use inside a modal. */
  embedded?: boolean;
  /** Pre-fill the form for editing an existing listing. */
  initialValues?: ListingFormValues;
  /** Minimum allowed group size (e.g. current member count). Sizes below this are disabled. */
  minGroupSize?: number;
  onSubmit: (input: NewListingInput) => void;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function defaultDateTime(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T19:00`;
}

export function ListFormalForm({
  profile,
  embedded = false,
  initialValues,
  minGroupSize = 1,
  onSubmit,
}: Props) {
  const editMode = !!initialValues;
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const menuPdfInputRef = useRef<HTMLInputElement>(null);

  const resolvedCollege = useMemo(
    () => normalizeCollegeName(profile.college),
    [profile.college],
  );

  const [dateTime, setDateTime] = useState(
    initialValues ? isoToLocalInput(initialValues.dateTime) : defaultDateTime(),
  );
  const [groupSize, setGroupSize] = useState<GroupSize>(
    initialValues?.groupSize ?? 2,
  );
  const [message, setMessage] = useState(initialValues?.message ?? "");
  const [menu, setMenu] = useState(initialValues?.menu ?? "");
  const [listingType, setListingType] = useState<ListingType>(
    initialValues?.listingType ?? "swap",
  );
  const [price, setPrice] = useState(
    initialValues?.price !== undefined ? String(initialValues.price) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [listingTypePickerOpen, setListingTypePickerOpen] = useState(false);

  const [menuPdfStorageId, setMenuPdfStorageId] = useState<
    Id<"_storage"> | undefined
  >();
  const [menuPdfFileName, setMenuPdfFileName] = useState<string | null>(null);
  const [existingMenuPdfUrl, setExistingMenuPdfUrl] = useState(
    initialValues?.menuPdfUrl ?? null,
  );
  const [existingMenuFileContentType, setExistingMenuFileContentType] =
    useState(initialValues?.menuFileContentType ?? null);
  const [pendingMenuPreviewUrl, setPendingMenuPreviewUrl] = useState<
    string | null
  >(null);
  const [clearMenuPdf, setClearMenuPdf] = useState(false);
  const [menuPdfUploading, setMenuPdfUploading] = useState(false);
  const [menuPdfError, setMenuPdfError] = useState<string | null>(null);

  const needsPrice = listingType === "pay" || listingType === "both";
  const hasMenuFile =
    !clearMenuPdf && !!(menuPdfStorageId || existingMenuPdfUrl);

  const menuPreviewUrl =
    pendingMenuPreviewUrl ??
    (!clearMenuPdf ? existingMenuPdfUrl : null);
  const menuPreviewIsImage =
    isMenuImageContentType(existingMenuFileContentType ?? undefined) ||
    !!pendingMenuPreviewUrl;

  async function handleMenuFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setMenuPdfError(null);
    setMenuPdfUploading(true);
    if (pendingMenuPreviewUrl) {
      URL.revokeObjectURL(pendingMenuPreviewUrl);
      setPendingMenuPreviewUrl(null);
    }
    try {
      const storageId = await uploadMenuFile(file, generateUploadUrl);
      setMenuPdfStorageId(storageId);
      setMenuPdfFileName(file.name);
      setExistingMenuPdfUrl(null);
      setExistingMenuFileContentType(null);
      setClearMenuPdf(false);
      if (file.type.startsWith("image/")) {
        setPendingMenuPreviewUrl(URL.createObjectURL(file));
      }
    } catch (err) {
      setMenuPdfError(
        err instanceof Error ? err.message : "Could not upload file.",
      );
    } finally {
      setMenuPdfUploading(false);
    }
  }

  function removeMenuFile() {
    if (pendingMenuPreviewUrl) {
      URL.revokeObjectURL(pendingMenuPreviewUrl);
    }
    setMenuPdfStorageId(undefined);
    setMenuPdfFileName(null);
    setExistingMenuPdfUrl(null);
    setExistingMenuFileContentType(null);
    setPendingMenuPreviewUrl(null);
    setClearMenuPdf(true);
    setMenuPdfError(null);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (menuPdfUploading) return;

    const year = profile.year.trim();
    const role = profile.role.trim();
    if (!resolvedCollege || !year || !role) {
      setError(
        "Set college, year, and role in My profile (Me tab), save, then try again.",
      );
      return;
    }
    if (!dateTime) {
      setError("Add a date & time.");
      return;
    }
    let priceNum: number | undefined;
    if (needsPrice) {
      priceNum = Number.parseInt(price.trim(), 10);
      if (!Number.isFinite(priceNum) || priceNum < 1) {
        setError("Enter a whole number of pounds (at least £1).");
        return;
      }
    }
    const iso = new Date(dateTime).toISOString();
    onSubmit({
      dateTime: iso,
      groupSize,
      message: message.trim(),
      menu: menu.trim(),
      listingType,
      ...(menuPdfStorageId !== undefined ? { menuPdfId: menuPdfStorageId } : {}),
      ...(clearMenuPdf ? { clearMenuPdf: true } : {}),
      ...(priceNum !== undefined ? { price: priceNum } : {}),
    });
    if (!editMode) {
      setDateTime("");
      setMessage("");
      setMenu("");
      setMenuPdfStorageId(undefined);
      setMenuPdfFileName(null);
      setExistingMenuPdfUrl(null);
      setExistingMenuFileContentType(null);
      setPendingMenuPreviewUrl(null);
      setClearMenuPdf(false);
      setListingType("swap");
      setPrice("");
    }
  }

  const fieldCls =
    "box-border min-w-0 max-w-full w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2 text-base focus:outline-none";

  const formInner = (
    <>
      <h3 className="font-display text-3xl uppercase tracking-wide">
        {editMode ? "Edit listing" : "+ List a formal"}
      </h3>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
        <label className="flex min-w-0 flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Date &amp; time</span>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className={fieldCls}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Listing type</span>
          <OutlineCombobox
            open={listingTypePickerOpen}
            onOpenChange={setListingTypePickerOpen}
            value={listingType}
            options={LISTING_TYPE_OPTIONS}
            onChange={(v) => {
              const next = v as ListingType;
              setListingType(next);
              if (next === "swap") setPrice("");
              setListingTypePickerOpen(false);
            }}
            placeholder="Choose listing type"
          />
        </label>
      </div>

      <div
        className={`grid grid-cols-1 gap-5 sm:gap-4 ${needsPrice ? "sm:grid-cols-2" : ""}`}
      >
        {needsPrice ? (
          <label className="flex min-w-0 flex-col gap-2">
            <span className="text-sm text-[var(--ink-muted)]">Price (£)</span>
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={price}
              onChange={(e) =>
                setPrice(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="25"
              className={fieldCls}
            />
          </label>
      ) : null}

        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Group size</span>
          <div className="flex flex-wrap gap-2">
            {GROUP_SIZES.map((s) => (
              <Chip
                key={s}
                variant={groupSize === s ? "filled" : "outline"}
                disabled={s < minGroupSize}
                onClick={() => setGroupSize(s)}
              >
                {s}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Menu (optional)</span>
          <textarea
            value={menu}
            onChange={(e) => setMenu(e.target.value)}
            rows={2}
            placeholder="What's on the menu?"
            className="box-border min-w-0 max-w-full w-full rounded-[20px] border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2 text-base focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => menuPdfInputRef.current?.click()}
              disabled={menuPdfUploading}
              className="rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {menuPdfUploading ? "Uploading…" : "Upload menu (PDF or image)"}
            </button>
            <input
              ref={menuPdfInputRef}
              type="file"
              accept={MENU_FILE_ACCEPT}
              className="hidden"
              onChange={handleMenuFileChange}
            />
            {hasMenuFile ? (
              <>
                {menuPdfFileName ? (
                  <span className="text-sm text-[var(--ink-muted)] truncate max-w-[12rem]">
                    {menuPdfFileName}
                  </span>
                ) : existingMenuPdfUrl && !menuPreviewIsImage ? (
                  <a
                    href={existingMenuPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm underline underline-offset-2 text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  >
                    Current file
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={removeMenuFile}
                  className="text-sm text-[var(--danger)] hover:underline"
                >
                  Remove file
                </button>
              </>
            ) : null}
          </div>
          {hasMenuFile && menuPreviewUrl && menuPreviewIsImage ? (
            <a
              href={menuPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={menuPreviewUrl}
                alt="Menu preview"
                className="max-h-32 max-w-full rounded-[12px] border-[2px] border-[var(--ink)] object-contain"
              />
            </a>
          ) : null}
          {menuPdfError ? (
            <p className="text-sm text-[var(--danger)]">{menuPdfError}</p>
          ) : null}
        </div>

        <label className="flex min-w-0 flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">
            Short message (optional)
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Anything to mention?"
            className="box-border min-w-0 max-w-full w-full rounded-[20px] border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2 text-base focus:outline-none"
          />
        </label>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <button
        type="submit"
        disabled={menuPdfUploading}
        className="self-start rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] px-5 py-2 text-base transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {editMode ? "Save changes" : "Post listing"}
      </button>
    </>
  );

  if (embedded) {
    return (
      <form onSubmit={handleSubmit} className="flex w-full min-w-0 flex-col gap-5">
        {formInner}
      </form>
    );
  }

  return (
    <SketchCard seed={4} className="p-6">
      <form onSubmit={handleSubmit} className="flex w-full min-w-0 flex-col gap-5">
        {formInner}
      </form>
    </SketchCard>
  );
}
