"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OutlineButton } from "@/components/ui/OutlineButton";
import { errorMessage } from "@/lib/errorMessage";
import { prepareCardPhoto } from "@/lib/upload/cardPhoto";
import { uploadImageFile } from "@/lib/upload/imageFile";

/**
 * Take or choose a photo of a University Card, check it looks right, send it.
 * Used at the end of sign-up and from the browse-only banner.
 */
export function CardPhotoForm({
  onDone,
  onSkip,
}: {
  onDone: () => void;
  onSkip?: () => void;
}) {
  const generateUploadUrl = useMutation(api.cardChecks.generateUploadUrl);
  const submit = useMutation(api.cardChecks.submit);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function onPick(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const prepared = await prepareCardPhoto(file);
      setPhoto(prepared);
      setPreview(URL.createObjectURL(prepared));
    } catch (e) {
      setError(errorMessage(e, "Couldn't open that photo. Try another."));
    } finally {
      setBusy(false);
    }
  }

  async function onSend() {
    if (!photo) return;
    setError(null);
    setBusy(true);
    try {
      const imageId = await uploadImageFile(photo, generateUploadUrl);
      await submit({ imageId });
      onDone();
    } catch (e) {
      setError(errorMessage(e, "Couldn't send that. Try again."));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onPick(e.currentTarget)}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onPick(e.currentTarget)}
      />

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Your University Card"
          className="max-h-64 w-full rounded-xl border-[2px] border-[var(--ink)] bg-[var(--bg)] object-contain"
        />
      ) : null}

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {preview ? (
        <>
          <OutlineButton
            variant="primary"
            disabled={busy}
            onClick={() => void onSend()}
            className="w-full py-3 text-base"
          >
            {busy ? "Sending…" : "Send"}
          </OutlineButton>
          <OutlineButton
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
            className="w-full py-2.5"
          >
            Retake
          </OutlineButton>
        </>
      ) : (
        <>
          <OutlineButton
            variant="primary"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
            className="w-full py-3 text-base"
          >
            Take a photo
          </OutlineButton>
          <OutlineButton
            disabled={busy}
            onClick={() => libraryRef.current?.click()}
            className="w-full py-2.5"
          >
            Choose a photo
          </OutlineButton>
        </>
      )}

      {onSkip ? (
        <button
          type="button"
          disabled={busy}
          onClick={onSkip}
          className="text-center text-xs text-[var(--ink-soft)] hover:text-[var(--ink)]"
        >
          Skip for now
        </button>
      ) : null}
    </div>
  );
}
