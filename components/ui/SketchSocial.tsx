type Props = {
  className?: string;
};

/** Paper-drawn Instagram glyph — rounded frame, lens, viewfinder dot. */
export function SketchInstagram({ className = "h-4 w-4" }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      aria-hidden
    >
      <path
        d="M6.2 4.6 C5.2 4.7 4.5 5.5 4.45 6.6 L4.3 17.1 C4.25 18.3 5.1 19.2 6.3 19.25 L17.6 19.45 C18.8 19.45 19.6 18.55 19.55 17.35 L19.4 6.9 C19.35 5.75 18.45 4.95 17.25 4.9 Z"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12.05"
        cy="12.1"
        r="3.35"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="16.55" cy="7.55" r="0.85" fill="currentColor" />
    </svg>
  );
}

/** Paper-drawn WhatsApp glyph — chat bubble with a handset. */
export function SketchWhatsApp({ className = "h-4 w-4" }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      aria-hidden
    >
      <path
        d="M5.4 18.6 L4.7 21.1 C4.55 21.55 5.05 21.95 5.5 21.75 L8.2 20.5 C9.35 21.05 10.65 21.35 12.05 21.35 C16.95 21.35 20.9 17.5 20.9 12.55 C20.9 7.6 16.95 3.75 12.05 3.75 C7.15 3.75 3.2 7.6 3.2 12.55 C3.2 14.15 3.65 15.65 4.45 16.9 Z"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.15 9.35 C8 8.55 8.45 8.15 9.15 8.35 L10.1 8.7 C10.45 8.85 10.6 9.2 10.55 9.55 L10.35 10.55 C10.3 10.9 10.45 11.15 10.75 11.3 C11.35 11.65 12.05 12.15 12.55 12.7 C12.75 12.95 13.05 13.05 13.4 12.95 L14.35 12.65 C14.7 12.55 15.05 12.7 15.2 13.05 L15.65 14.05 C15.85 14.7 15.45 15.2 14.7 15.15 C12.35 14.95 9.55 12.35 8.15 9.35 Z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
