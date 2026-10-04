"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { CheckIcon } from "@/components/ui/icons";

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-6 w-6"
    >
      {children}
    </svg>
  );
}

const WhatsAppGlyph = () => (
  <Glyph>
    <path d="M3.5 20.5 4.8 16A8.5 8.5 0 1 1 8 19.2l-4.5 1.3Z" />
    <path d="M9 8.6c0 3 2.4 6 6.4 6.4l1.1-1.6-2-1-.9.9c-.9-.4-1.9-1.4-2.3-2.3l.9-.9-1-2L9 8.6Z" />
  </Glyph>
);
const InstagramGlyph = () => (
  <Glyph>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.2 6.8h.01" />
  </Glyph>
);
const TelegramGlyph = () => (
  <Glyph>
    <path d="m21 4-3.2 15.2-5.3-4-2.8 2.8-.4-4.6L21 4Z" />
    <path d="M21 4 3 11l6.3 2.4" />
  </Glyph>
);
const MessageGlyph = () => (
  <Glyph>
    <path d="M20 4H4v12h4v4l5-4h7V4Z" />
  </Glyph>
);
const MailGlyph = () => (
  <Glyph>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7 8 6 8-6" />
  </Glyph>
);
const LinkGlyph = () => (
  <Glyph>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" />
  </Glyph>
);
const MoreGlyph = () => (
  <Glyph>
    <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth="3" />
  </Glyph>
);

const TILE =
  "group flex w-16 shrink-0 cursor-pointer flex-col items-center gap-2 whitespace-nowrap text-center text-[0.78rem] text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)] disabled:cursor-default disabled:opacity-50";
const DISC =
  "grid h-14 w-14 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] transition-colors group-hover:bg-[var(--ink)] group-hover:text-[var(--bg)]";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Absolute link to share. */
  url: string;
  /** Sentence sent along with the link. */
  text: string;
  /** Makes and shares the Instagram story image; omit when there's no card. */
  onStoryImage?: () => Promise<boolean>;
};

/**
 * Phones: hand the link to the system share sheet (where Instagram, Messages
 * and the rest already live) and resolve true. Resolves false on desktop, or
 * if the sheet couldn't open, so the caller shows SharePopup instead.
 */
export async function shareViaSheet(share: { text: string; url: string }): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function" ||
    !window.matchMedia("(pointer: coarse)").matches
  ) {
    return false;
  }
  try {
    await navigator.share(share);
    return true;
  } catch (e) {
    // Closing the sheet is a choice, not a failure.
    return (e as DOMException)?.name === "AbortError";
  }
}

/** Desktop share popup: one round icon per place the link can go. */
export function SharePopup({ open, onClose, title = "Share", url, text, onStoryImage }: Props) {
  const [copied, setCopied] = useState(false);
  const [story, setStory] = useState<"idle" | "busy" | "error">("idle");
  const both = encodeURIComponent(`${text} ${url}`);
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  const links: { label: string; href: string; icon: ReactNode }[] = [
    { label: "WhatsApp", href: `https://api.whatsapp.com/send?text=${both}`, icon: <WhatsAppGlyph /> },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      icon: <TelegramGlyph />,
    },
    { label: "Messages", href: `sms:?&body=${both}`, icon: <MessageGlyph /> },
    {
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent(text)}&body=${both}`,
      icon: <MailGlyph />,
    },
  ];

  return (
    <Modal open={open} onClose={onClose} title={title} panelClassName="!w-auto !max-w-[min(40rem,calc(100vw-1.5rem))]">
      {/* One row; scrolls sideways if a phone can't fit it. */}
      <div className="overflow-x-auto pb-1 pt-1">
        <div className="mx-auto flex w-max gap-4">
        {onStoryImage ? (
          <button
            type="button"
            disabled={story === "busy"}
            className={TILE}
            onClick={async () => {
              setStory("busy");
              try {
                setStory((await onStoryImage()) ? "idle" : "error");
              } catch {
                setStory("error");
              }
            }}
          >
            <span className={DISC}>
              <InstagramGlyph />
            </span>
            {story === "busy" ? "Making…" : story === "error" ? "Try again" : "Story"}
          </button>
        ) : null}
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className={TILE}
          >
            <span className={DISC}>{l.icon}</span>
            {l.label}
          </a>
        ))}
        <button
          type="button"
          className={TILE}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            } catch {
              // Clipboard blocked: the other options still work.
            }
          }}
        >
          <span className={DISC}>
            {copied ? <CheckIcon className="!h-6 !w-6" /> : <LinkGlyph />}
          </span>
          {copied ? "Copied" : "Copy link"}
        </button>
        {canNativeShare ? (
          <button
            type="button"
            className={TILE}
            onClick={() => void navigator.share({ text, url }).catch(() => {})}
          >
            <span className={DISC}>
              <MoreGlyph />
            </span>
            More
          </button>
        ) : null}
        </div>
      </div>
    </Modal>
  );
}
