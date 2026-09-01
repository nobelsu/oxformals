"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { encodeSquareCrop } from "@/lib/upload/avatarImage";

type Props = {
  src: string | null;
  onClose: () => void;
  onConfirm: (dataUrl: string) => void;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function coverScale(viewport: number, width: number, height: number) {
  return Math.max(viewport / width, viewport / height);
}

function clampOffset(
  x: number,
  y: number,
  zoom: number,
  width: number,
  height: number,
  viewport: number,
) {
  const scale = coverScale(viewport, width, height) * zoom;
  const dw = width * scale;
  const dh = height * scale;
  return {
    x: clamp(x, Math.min(0, viewport - dw), 0),
    y: clamp(y, Math.min(0, viewport - dh), 0),
  };
}

function centeredOffset(
  zoom: number,
  width: number,
  height: number,
  viewport: number,
) {
  const scale = coverScale(viewport, width, height) * zoom;
  return clampOffset(
    (viewport - width * scale) / 2,
    (viewport - height * scale) / 2,
    zoom,
    width,
    height,
    viewport,
  );
}

export function PhotoCropModal({ src, onClose, onConfirm }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const pinchRef = useRef<{
    distance: number;
    zoom: number;
  } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());

  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [viewport, setViewport] = useState(280);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetView = useCallback((w: number, h: number, vp: number) => {
    setZoom(1);
    setOffset(centeredOffset(1, w, h, vp));
  }, []);

  useEffect(() => {
    if (!src) {
      setNatural(null);
      return;
    }
    setError(null);
    setBusy(false);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) {
        setError("Could not read that image.");
        return;
      }
      setNatural({ w, h });
      const vp = stageRef.current?.clientWidth ?? 280;
      setViewport(vp);
      resetView(w, h, vp);
    };
    img.onerror = () => setError("Could not read that image.");
    img.src = src;
  }, [src, resetView]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !src) return;
    const ro = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0);
      if (next < 32) return;
      setViewport((prev) => {
        if (Math.abs(prev - next) < 1) return prev;
        return next;
      });
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, [src]);

  useEffect(() => {
    if (!natural) return;
    setOffset((prev) =>
      clampOffset(prev.x, prev.y, zoom, natural.w, natural.h, viewport),
    );
  }, [natural, viewport, zoom]);

  const applyZoom = useCallback(
    (nextZoom: number, focal?: { x: number; y: number }) => {
      if (!natural) return;
      const z = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      const oldScale = coverScale(viewport, natural.w, natural.h) * zoom;
      const newScale = coverScale(viewport, natural.w, natural.h) * z;
      const cx = focal?.x ?? viewport / 2;
      const cy = focal?.y ?? viewport / 2;
      const imgX = (cx - offset.x) / oldScale;
      const imgY = (cy - offset.y) / oldScale;
      const next = clampOffset(
        cx - imgX * newScale,
        cy - imgY * newScale,
        z,
        natural.w,
        natural.h,
        viewport,
      );
      setZoom(z);
      setOffset(next);
    },
    [natural, offset.x, offset.y, viewport, zoom],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !src) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = stage.getBoundingClientRect();
      applyZoom(zoom * (e.deltaY > 0 ? 0.94 : 1.06), {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [applyZoom, src, zoom]);

  function pointerPos(e: React.PointerEvent) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!natural) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = pointerPos(e);
    pointersRef.current.set(e.pointerId, pos);
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      const a = pts[0];
      const b = pts[1];
      if (a && b) {
        pinchRef.current = {
          distance: Math.hypot(b.x - a.x, b.y - a.y),
          zoom,
        };
      }
      dragRef.current = null;
      return;
    }
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!natural) return;
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, pointerPos(e));
    }
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()];
      const a = pts[0];
      const b = pts[1];
      if (!a || !b) return;
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (pinchRef.current.distance > 0) {
        setZoom(
          clamp(
            pinchRef.current.zoom * (dist / pinchRef.current.distance),
            MIN_ZOOM,
            MAX_ZOOM,
          ),
        );
      }
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setOffset(
      clampOffset(
        drag.origX + (e.clientX - drag.startX),
        drag.origY + (e.clientY - drag.startY),
        zoom,
        natural.w,
        natural.h,
        viewport,
      ),
    );
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }

  async function confirm() {
    if (!src || !natural || busy) return;
    setBusy(true);
    setError(null);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not read image"));
        el.src = src;
      });
      const scale = coverScale(viewport, natural.w, natural.h) * zoom;
      const size = viewport / scale;
      const sx = clamp(-offset.x / scale, 0, Math.max(0, natural.w - size));
      const sy = clamp(-offset.y / scale, 0, Math.max(0, natural.h - size));
      const dataUrl = encodeSquareCrop(img, { sx, sy, size });
      if (!dataUrl) {
        setError("That image is too big — try a smaller one.");
        return;
      }
      onConfirm(dataUrl);
    } catch {
      setError("Could not crop that image.");
    } finally {
      setBusy(false);
    }
  }

  const scale = natural
    ? coverScale(viewport, natural.w, natural.h) * zoom
    : 1;

  return (
    <Modal
      open={!!src}
      onClose={onClose}
      title="Crop photo"
      compact
      bodyScrollable={false}
      panelClassName="!max-w-lg"
    >
      <p className="-mt-1 mb-3 text-[0.8rem] text-[var(--ink-muted)]">
        Drag to move · scroll or pinch to zoom
      </p>

      <div
        ref={stageRef}
        className="relative mx-auto aspect-square w-full max-h-[min(28rem,62dvh)] cursor-grab touch-none overflow-hidden bg-[#1a1914] ring-2 ring-[var(--ink)] active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            draggable={false}
            className="absolute max-w-none select-none"
            style={{
              width: natural ? natural.w * scale : undefined,
              height: natural ? natural.h * scale : undefined,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
        ) : null}
        <div
          className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-white/80"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-white/80"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-white/80"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-white/80"
          aria-hidden
        />
      </div>

      <label className="mt-3 flex items-center gap-3">
        <span className="text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
          Zoom
        </span>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => applyZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[color-mix(in_srgb,var(--ink)_18%,transparent)] accent-[var(--accent)]"
        />
      </label>

      {error ? (
        <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-4 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={busy || !natural}
          className="cursor-pointer rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Saving…" : "Use photo"}
        </button>
      </div>
    </Modal>
  );
}
