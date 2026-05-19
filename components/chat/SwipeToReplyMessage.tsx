"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const SWIPE_THRESHOLD_PX = 56;
const MAX_SWIPE_PX = 72;
const LOCK_THRESHOLD_PX = 10;

type Props = {
  onReply: () => void;
  children: ReactNode;
};

export function SwipeToReplyMessage({ onReply, children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    locked: boolean | null;
  } | null>(null);
  const offsetRef = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const setOffset = useCallback((next: number) => {
    offsetRef.current = next;
    setOffsetX(next);
  }, []);

  const resetDrag = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
    setOffset(0);
  }, [setOffset]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0]!;
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      locked: null,
    };
    setDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const drag = dragRef.current;
      if (!drag || e.touches.length !== 1) return;

      const touch = e.touches[0]!;
      const dx = touch.clientX - drag.startX;
      const dy = touch.clientY - drag.startY;

      if (drag.locked === null) {
        if (
          Math.abs(dx) < LOCK_THRESHOLD_PX &&
          Math.abs(dy) < LOCK_THRESHOLD_PX
        ) {
          return;
        }
        drag.locked = Math.abs(dx) > Math.abs(dy);
      }

      if (!drag.locked) return;

      const next = Math.min(Math.max(0, dx), MAX_SWIPE_PX);
      if (next > 0) {
        e.preventDefault();
      }
      setOffset(next);
    },
    [setOffset],
  );

  const handleTouchEnd = useCallback(() => {
    if (offsetRef.current >= SWIPE_THRESHOLD_PX) {
      onReply();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
      }
    }
    resetDrag();
  }, [onReply, resetDrag]);

  const handleTouchCancel = useCallback(() => {
    resetDrag();
  }, [resetDrag]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onTouchMove = (e: TouchEvent) => {
      if (dragRef.current?.locked && offsetRef.current > 0) {
        e.preventDefault();
      }
    };

    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  const iconOpacity = Math.min(1, offsetX / SWIPE_THRESHOLD_PX);
  const iconScale = 0.65 + iconOpacity * 0.35;

  return (
    <div
      ref={rootRef}
      className="relative max-w-[85%] sm:contents sm:max-w-none"
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[var(--ink-soft)] sm:hidden"
        style={{
          opacity: iconOpacity,
          transform: `translateY(-50%) scale(${iconScale})`,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 14 4 9 9 4" />
          <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
        </svg>
      </span>
      <div
        className={dragging ? "" : "transition-transform duration-200 ease-out"}
        style={{
          transform: offsetX > 0 ? `translateX(${offsetX}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
