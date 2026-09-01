const TARGET_SIZE = 640;
const MAX_DATA_URL_BYTES = 450 * 1024;

function drawSmoothed(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);
}

/** JPEG data URL of a square crop from an already-decoded image. */
export function encodeSquareCrop(
  image: CanvasImageSource,
  crop: { sx: number; sy: number; size: number },
): string | null {
  const size = Math.max(1, crop.size);
  const out = Math.min(TARGET_SIZE, Math.round(size));
  const workSize = Math.min(Math.round(size), out * 4);

  const cropped = document.createElement("canvas");
  cropped.width = workSize;
  cropped.height = workSize;
  const cropCtx = cropped.getContext("2d");
  if (!cropCtx) return null;
  drawSmoothed(
    cropCtx,
    image,
    crop.sx,
    crop.sy,
    size,
    size,
    0,
    0,
    workSize,
    workSize,
  );

  let current: HTMLCanvasElement = cropped;
  while (current.width / 2 >= out) {
    const next = document.createElement("canvas");
    next.width = Math.round(current.width / 2);
    next.height = Math.round(current.height / 2);
    const nextCtx = next.getContext("2d");
    if (!nextCtx) break;
    drawSmoothed(
      nextCtx,
      current,
      0,
      0,
      current.width,
      current.height,
      0,
      0,
      next.width,
      next.height,
    );
    current = next;
  }

  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawSmoothed(
    ctx,
    current,
    0,
    0,
    current.width,
    current.height,
    0,
    0,
    out,
    out,
  );

  let quality = 0.92;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_DATA_URL_BYTES && quality > 0.72) {
    quality -= 0.05;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > MAX_DATA_URL_BYTES) return null;
  return dataUrl;
}
