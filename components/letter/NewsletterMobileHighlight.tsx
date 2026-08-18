import {
  newsletterAppLinks,
  newsletterCtaLinks,
} from "@/lib/letter/newsletterLinks";
import { NEWSLETTER_MOBILE } from "@/lib/letter/newsletterContent";

function PhoneIcon({ className = "h-14 w-14 shrink-0" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      aria-hidden
    >
      <rect
        x="12"
        y="4"
        width="24"
        height="40"
        rx="4"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <rect
        x="14"
        y="8"
        width="20"
        height="28"
        rx="2"
        fill="var(--accent-wash)"
        fillOpacity="0.4"
      />
      <circle cx="24" cy="38" r="2" fill="currentColor" />
      <path
        d="M20 12 H28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AppleIcon({ className = "h-5 w-5 shrink-0" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83z" />
      <path d="M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function AndroidIcon({ className = "h-5 w-5 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M6.2 8.5l-1.4-2.4a.9.9 0 1 1 1.6-.9l1.6 2.7A7.9 7.9 0 0 1 12 7c1.2 0 2.3.3 3.3.8l1.6-2.7a.9.9 0 1 1 1.6.9L17.8 8.5A7.8 7.8 0 0 1 20 13v5h-1.5v2.2a1.8 1.8 0 1 1-3.6 0V18H9.1v2.2a1.8 1.8 0 1 1-3.6 0V18H4v-5c0-1.7.8-3.2 2.2-4.5zM8.3 15.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm7.4 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
    </svg>
  );
}

const APP_BUTTON_CLS =
  "newsletter-cta newsletter-cta--primary inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]";

function AppStoreButton({ link }: { link: ReturnType<typeof newsletterAppLinks>[number] }) {
  const Icon = link.id === "ios" ? AppleIcon : AndroidIcon;

  if (!link.ready) {
    return (
      <span
        className={`${APP_BUTTON_CLS} cursor-not-allowed opacity-55`}
        aria-disabled="true"
        title="App link coming soon"
      >
        <Icon />
        {link.label}
      </span>
    );
  }

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={APP_BUTTON_CLS}
    >
      <Icon />
      {link.label}
    </a>
  );
}

export function NewsletterMobileHighlight() {
  const appLinks = newsletterAppLinks();
  const otherCtas = newsletterCtaLinks().filter(
    (c) => c.id !== "ios" && c.id !== "android",
  );

  return (
    <section
      className="newsletter-mobile-highlight relative overflow-hidden rounded-2xl border-[2.5px] border-[var(--ink)] p-5 sm:p-6"
      aria-labelledby="newsletter-mobile-heading"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[var(--accent-wash)] opacity-30" aria-hidden />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:gap-3">
          <PhoneIcon className="h-12 w-12 text-[var(--ink)] sm:h-14 sm:w-14" />
          <span className="newsletter-mobile-badge font-display shrink-0 rounded-full border-2 border-[var(--ink)] bg-[var(--tag)] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--tag-ink)] sm:text-xs">
            {NEWSLETTER_MOBILE.badge}
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <p className="font-display text-xs uppercase tracking-[0.28em] text-[var(--ink-muted)]">
            Big news this week
          </p>
          <h2
            id="newsletter-mobile-heading"
            className="font-display text-2xl uppercase leading-tight tracking-wide text-[var(--ink)] sm:text-[1.65rem]"
          >
            {NEWSLETTER_MOBILE.headline}
          </h2>
          <p className="break-words text-[var(--ink-muted)] leading-relaxed">
            {NEWSLETTER_MOBILE.body}
          </p>
        </div>
      </div>

      <div className="relative mt-5 space-y-3 border-t border-dashed border-[var(--ink-soft)] pt-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          {appLinks.map((link) => (
            <AppStoreButton key={link.id} link={link} />
          ))}
        </div>
        {otherCtas.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {otherCtas.map((cta) => (
              <a
                key={cta.id}
                href={cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="newsletter-cta inline-flex items-center justify-center rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
              >
                {cta.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
