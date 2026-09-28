export type ShareKind = "listing" | "review";

/**
 * Fetch a story card and hand it to the phone's share sheet (pick Instagram →
 * Story); where files can't be shared (most desktops), download it instead.
 * Returns false only when the image couldn't be made.
 */
export async function shareCard(kind: ShareKind, id: string): Promise<boolean> {
  const res = await fetch(`/api/share/${kind}/${encodeURIComponent(id)}`);
  if (!res.ok) return false;
  const blob = await res.blob();
  const file = new File([blob], `oxformals-${kind}.png`, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch (e) {
      // Closing the share sheet isn't an error worth showing.
      if ((e as DOMException)?.name !== "AbortError") throw e;
    }
    return true;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}
