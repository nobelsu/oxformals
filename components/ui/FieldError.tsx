/** A field's error, shown under its label: bordered card with an alert icon. */
export function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="alert"
      className="mt-1 flex items-center gap-2.5 rounded-2xl border-[2px] border-[var(--ink)] bg-[var(--paper)] px-3.5 py-2.5 text-sm text-[var(--ink)]"
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4 shrink-0 text-[var(--accent)]"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-12a1 1 0 0 1 1 1v3.5a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1Zm0 8.5a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z"
          clipRule="evenodd"
        />
      </svg>
      {children}
    </span>
  );
}
