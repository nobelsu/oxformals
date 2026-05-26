"use client";

import Link from "next/link";
import { MountainRankIcon } from "@/components/colleges/RankMountainArt";
import { NewsletterFeatureIcon } from "@/components/letter/NewsletterFeatureIcon";
import { NewsletterMobileHighlight } from "@/components/letter/NewsletterMobileHighlight";
import { OxfordPostmark } from "@/components/letter/OxfordPostmark";
import {
  NEWSLETTER_FEATURES,
  NEWSLETTER_DATE,
  NEWSLETTER_GREETING,
  NEWSLETTER_INTRO_OPENING,
  NEWSLETTER_INTRO_STATS,
  NEWSLETTER_MISSION_LINE,
  NEWSLETTER_SERIOUS,
  NEWSLETTER_SERIOUS_LEAD,
  NEWSLETTER_SIGN_OFF,
  NEWSLETTER_STATS,
  NEWSLETTER_SUBJECT,
} from "@/lib/letter/newsletterContent";
type Props = {
  animateIn?: boolean;
};

export function NewsletterLetter({ animateIn = true }: Props) {
  return (
    <article
      className={[
        "mx-auto w-full max-w-[42rem] pb-8",
        animateIn ? "letter-reveal-enter" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="mb-4 text-center">
        <Link
          href="/"
          className="text-sm text-[var(--ink-muted)] underline decoration-[var(--ink-soft)] underline-offset-4 transition-colors hover:text-[var(--ink)]"
        >
          Back to oxformals
        </Link>
      </p>

      <div className="newsletter-letter-paper mx-auto w-full">
        <div className="newsletter-letter-inner flex min-w-0 flex-col gap-6 px-6 py-7 text-[var(--ink)] text-base leading-relaxed sm:gap-7 sm:px-8 sm:py-9">
            <header className="flex items-start justify-between gap-4 border-b border-dashed border-[var(--ink-soft)] pb-5">
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="font-display text-xs uppercase tracking-[0.35em] text-[var(--ink-muted)]">
                  Subject
                </p>
                <h1 className="font-display text-xl uppercase leading-tight tracking-wide text-balance sm:text-2xl">
                  {NEWSLETTER_SUBJECT}
                </h1>
                <p className="text-xs text-[var(--ink-muted)]">{NEWSLETTER_DATE}</p>
              </div>
              <OxfordPostmark className="mt-0.5 shrink-0 rotate-6 opacity-90" />
            </header>

            <p className="text-xl text-[var(--ink)]">{NEWSLETTER_GREETING}</p>

            <div className="space-y-4 break-words text-[var(--ink-muted)]">
              <p className="leading-relaxed">{NEWSLETTER_INTRO_OPENING}</p>
              <p className="leading-relaxed">
                {NEWSLETTER_INTRO_STATS.before}
                <Stat value={NEWSLETTER_STATS.users} label="users" />
                {NEWSLETTER_INTRO_STATS.betweenUsersAndRequests}
                <Stat value={NEWSLETTER_STATS.requests} label="requests" />
                {NEWSLETTER_INTRO_STATS.betweenRequestsAndListings}
                <Stat value={NEWSLETTER_STATS.listings} label="lifetime listings" />
                {NEWSLETTER_INTRO_STATS.after}
              </p>
            </div>

            <ol className="list-none space-y-3 pl-0">
              {NEWSLETTER_FEATURES.map((feature, index) => (
                <li
                  key={feature.title}
                  className="newsletter-feature-item flex gap-3 p-4 sm:gap-4"
                >
                  <span
                    className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--accent)] text-sm text-[var(--accent-ink)]"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display flex flex-wrap items-center gap-2 text-base uppercase tracking-wide text-[var(--ink)] sm:text-lg">
                      <span>{feature.title}</span>
                      <NewsletterFeatureIcon
                        name={feature.icon}
                        className="h-5 w-5 shrink-0 text-[var(--ink)]"
                      />
                    </p>
                    {feature.body ? (
                      <p className="mt-2 break-words text-[var(--ink-muted)] leading-relaxed">
                        {feature.body}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>

            <NewsletterMobileHighlight />

            <div className="space-y-4 break-words text-[var(--ink-muted)]">
              <p className="leading-relaxed">
                {NEWSLETTER_SERIOUS_LEAD.slice(0, NEWSLETTER_SERIOUS_LEAD.indexOf("REALLY"))}
                <strong className="text-[var(--ink)]">REALLY</strong>
                {NEWSLETTER_SERIOUS_LEAD.slice(
                  NEWSLETTER_SERIOUS_LEAD.indexOf("REALLY") + "REALLY".length,
                )}
              </p>
              <p className="leading-relaxed text-[var(--ink)] italic">
                {NEWSLETTER_MISSION_LINE}
              </p>
              {NEWSLETTER_SERIOUS.map((paragraph) => (
                <p key={paragraph.slice(0, 28)} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            <footer className="flex items-end justify-between gap-4 border-t border-dashed border-[var(--ink-soft)] pt-5 text-[var(--ink-muted)]">
              <div className="min-w-0">
                <p>{NEWSLETTER_SIGN_OFF.line}</p>
                <p className="font-display mt-2 text-xl uppercase tracking-wide text-[var(--ink)]">
                  {NEWSLETTER_SIGN_OFF.team}
                </p>
              </div>
              <MountainRankIcon
                variant="summit"
                className="h-10 w-10 shrink-0 opacity-80"
              />
            </footer>
        </div>
      </div>
    </article>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="newsletter-stat-pop font-display text-[var(--ink)] underline decoration-[var(--accent-hover)] decoration-[3px] underline-offset-[3px]">
      {value} {label}
    </span>
  );
}
