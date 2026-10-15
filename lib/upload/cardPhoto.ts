/** Longest edge a card photo is scaled down to: plenty to read the text. */
const MAX_EDGE = 2000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't open that photo. Try another."));
    img.src = src;
  });
}

/**
 * Re-encode a phone photo as a JPEG no larger than MAX_EDGE, so big camera
 * files and formats like HEIC fit the upload limit and can be read.
 */
export async function prepareCardPhoto(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (!longest) throw new Error("Couldn't open that photo. Try another.");
    const scale = Math.min(1, MAX_EDGE / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Couldn't open that photo. Try another.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88),
    );
    if (!blob) throw new Error("Couldn't open that photo. Try another.");
    return new File([blob], "card.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
