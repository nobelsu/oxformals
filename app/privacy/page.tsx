import type { ReactNode } from "react";

const H2 =
  "font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]";
const P = "leading-relaxed text-[var(--ink-muted)]";
const UL = "list-disc space-y-2 pl-5 leading-relaxed text-[var(--ink-muted)]";
/** Table rows that stack on phones (label shown inline) and line up from sm. */
const HEAD_ROW =
  "hidden gap-3 border-b-[1.5px] border-[var(--ink)] pb-2 font-semibold text-[var(--ink)] sm:grid";
const ROW =
  "grid gap-1 border-b border-[color-mix(in_srgb,var(--ink)_14%,transparent)] py-3 sm:gap-3";
const CELL_LABEL = "font-semibold text-[var(--ink)] sm:hidden";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className={H2}>{title}</h2>
      {children}
    </section>
  );
}

/** A value the operator still has to supply; visible on purpose. */
function Fill({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-[var(--accent-wash)] px-1 text-[var(--accent-wash-ink)]">
      [{children}]
    </mark>
  );
}

function Email() {
  return (
    <a href="mailto:team@oxformals.com" className="underline underline-offset-4">
      team@oxformals.com
    </a>
  );
}

const COLLECT: { what: string; items: string; seenBy: string }[] = [
  {
    what: "Account",
    items:
      "Oxford email address, name, college, year, role (e.g. undergraduate), subject. A password if you set one (stored hashed).",
    seenBy:
      "Email: only us. Name, college, year, role, subject: other members. Name, college, year and role also show on your listings, which anyone can see.",
  },
  {
    what: "Profile",
    items:
      "Bio, profile photo or avatar, Instagram handle, phone/WhatsApp number (optional), dietary requirements (only if you opt in).",
    seenBy:
      "Bio and photo: other members. Instagram, phone and dietary requirements: only people you're matched with for an upcoming formal.",
  },
  {
    what: "Activity",
    items:
      "Listings, requests and swaps, seat credits, group bookings and the friends you name in them, follows, your private-account setting, college reviews and their photos, review votes, feed comments, likes and bookmarks, badges, attendance confirmations, wishlist colleges, college tips and guide edits.",
    seenBy:
      "Listings, reviews, tips and guides: anyone (you can post a review anonymously). Comments: anyone who can see what you commented on. With a private account, your reviews, badges, attended formals and wishlist are followers only. Requests and swaps: the people involved. Votes, likes, bookmarks, credits: only you.",
  },
  {
    what: "Messages",
    items: "Chats and group chats, including mentions and shared listings.",
    seenBy: "The people in that chat.",
  },
  {
    what: "Reports",
    items:
      "Bio and review reports you make or that are made about you (including a copy of the reported text).",
    seenBy: "Only us.",
  },
  {
    what: "Device",
    items:
      "Push notification tokens for the mobile app, your notification settings, your chosen UI font.",
    seenBy: "Only us.",
  },
  {
    what: "Technical",
    items:
      "Server and security logs (IP address, browser or device, time of request) kept by our hosting providers.",
    seenBy: "Only us and those providers.",
  },
];

const BASES: { why: string; basis: string }[] = [
  {
    why: "Running your account, listings, requests, swaps, credits, chats and profile",
    basis: "Contract: it's the service you signed up for.",
  },
  {
    why: "Service emails (sign-in codes, request updates, formals that change)",
    basis: "Contract.",
  },
  {
    why: "Checking you're an Oxford member (Oxford email)",
    basis: "Legitimate interests: keeping the community to Oxford students.",
  },
  {
    why: "Safety and moderation: automated checks on bios and tips, reports, swap-break records, rate limits",
    basis: "Legitimate interests: keeping members safe and stopping abuse.",
  },
  {
    why: "Fixing bugs and improving the product",
    basis: "Legitimate interests.",
  },
  {
    why: "Sharing dietary requirements with your formal matches",
    basis:
      "Explicit consent (the tick box in your profile). Untick it to withdraw.",
  },
  {
    why: "Push notifications and optional email notifications",
    basis: "Consent. Turn them off in Settings or on your device.",
  },
];

const PROVIDERS: { name: string; does: string }[] = [
  { name: "Convex", does: "Database, file storage and backend." },
  { name: "Vercel", does: "Hosts the website." },
  { name: "Resend", does: "Sends our emails." },
  { name: "Expo", does: "Delivers push notifications to the mobile app." },
  {
    name: "OpenAI",
    does: "Automatically checks bios and college tips for abusive content before they're published. Reports from members are reviewed by a person.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <article className="space-y-8">
        <header className="space-y-2">
          <h1 className="font-display text-3xl uppercase tracking-[0.12em] text-[var(--ink)] sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Effective date: 29 September 2026
          </p>
        </header>

        <Section title="Who we are">
          <p className={P}>
            Oxformals helps Oxford students find, list and swap seats at college
            formals. The controller of your personal data is{" "}
            <Fill>LEGAL NAME</Fill>, <Fill>ADDRESS</Fill>. Contact us about
            anything in this policy at <Email />.
          </p>
        </Section>

        <Section title="What we collect and who sees it">
          <p className={P}>
            We collect what you give us and what you do on Oxformals. Nothing is
            bought from third parties.
          </p>
          <div role="table" className="text-sm leading-relaxed text-[var(--ink-muted)]">
            <div role="row" className={`${HEAD_ROW} sm:grid-cols-[6rem_1fr_1fr]`}>
              <span role="columnheader">Data</span>
              <span role="columnheader">What</span>
              <span role="columnheader">Who can see it</span>
            </div>
            {COLLECT.map((row) => (
              <div
                role="row"
                key={row.what}
                className={`${ROW} sm:grid-cols-[6rem_1fr_1fr]`}
              >
                <span role="cell" className="font-semibold text-[var(--ink)]">
                  {row.what}
                </span>
                <span role="cell">{row.items}</span>
                <span role="cell">
                  <span className={CELL_LABEL}>Who can see it: </span>
                  {row.seenBy}
                </span>
              </div>
            ))}
          </div>
          <p className={P}>
            Share images (for Instagram stories) show only a first name, or no
            name for anonymous reviews and private accounts.
          </p>
        </Section>

        <Section title="Why we use it">
          <div role="table" className="text-sm leading-relaxed text-[var(--ink-muted)]">
            <div role="row" className={`${HEAD_ROW} sm:grid-cols-2`}>
              <span role="columnheader">Purpose</span>
              <span role="columnheader">Lawful basis (UK GDPR)</span>
            </div>
            {BASES.map((row) => (
              <div role="row" key={row.why} className={`${ROW} sm:grid-cols-2`}>
                <span role="cell" className="text-[var(--ink)] sm:text-[var(--ink-muted)]">
                  {row.why}
                </span>
                <span role="cell">
                  <span className={CELL_LABEL}>Basis: </span>
                  {row.basis}
                </span>
              </div>
            ))}
          </div>
          <p className={P}>
            We don&apos;t sell your data, show ads or make decisions about you
            by automated means alone.
          </p>
        </Section>

        <Section title="Service providers and transfers">
          <p className={P}>
            These companies process data for us, under contract and only on our
            instructions:
          </p>
          <ul className={UL}>
            {PROVIDERS.map((p) => (
              <li key={p.name}>
                <span className="font-semibold text-[var(--ink)]">
                  {p.name}
                </span>{" "}
                — {p.does}
              </li>
            ))}
          </ul>
          <p className={P}>
            All of them are based in, or store data in, the United States. We
            rely on the UK Extension to the EU–US Data Privacy Framework (the
            &ldquo;UK–US data bridge&rdquo;) where the provider is certified,
            and otherwise on the UK International Data Transfer Addendum to the
            EU Standard Contractual Clauses.
          </p>
        </Section>

        <Section title="How long we keep it">
          <ul className={UL}>
            <li>Sign-in codes: 10 minutes, single use.</li>
            <li>
              Sign-in cookie: 7 days. Server sessions end after 30 days, or when
              you sign out.
            </li>
            <li>
              Your account: until you delete it. Past listings and requests stay
              with your account until then.
            </li>
            <li>
              Server logs: as long as our hosting providers keep them, typically
              days to weeks.
            </li>
          </ul>
          <p className={P}>
            When you delete your account we remove your profile, email, sign-in
            records, follows, likes, bookmarks, comments, tips, votes, reports,
            badges, wishlist, push tokens, credit balance and every photo or
            file you uploaded, and blank the free text on your requests. Some
            records are kept, without your name, because other people rely on
            them:
          </p>
          <ul className={UL}>
            <li>
              Messages you sent stay in the other person&apos;s chat, shown as
              from &ldquo;Deleted user&rdquo;, for <Fill>N</Fill> months.
            </li>
            <li>
              Your college reviews (text and ratings, not photos) stay, shown as
              by &ldquo;Deleted user&rdquo;, for <Fill>N</Fill> months.
            </li>
            <li>
              Seat-credit records stay so other members&apos; balances add up,
              for <Fill>N</Fill> years.
            </li>
            <li>
              Records of broken swaps stay to prevent abuse, for{" "}
              <Fill>N</Fill> months.
            </li>
          </ul>
        </Section>

        <Section title="Your rights">
          <p className={P}>Under UK data protection law you can:</p>
          <ul className={UL}>
            <li>Access your data: ask us for a copy.</li>
            <li>Correct it: edit your profile, or ask us.</li>
            <li>
              Erase it: Settings → Delete account, any time. It takes effect
              immediately.
            </li>
            <li>
              Take it with you (portability): email <Email /> for an export.
            </li>
            <li>Restrict or object to how we use it.</li>
            <li>
              Withdraw consent: untick dietary sharing in your profile, or turn
              off notifications. This doesn&apos;t affect what we did before.
            </li>
          </ul>
          <p className={P}>
            Email <Email /> to use any of these. We reply within one month. If
            you&apos;re unhappy with how we handle your data, you can complain
            to the Information Commissioner&apos;s Office at{" "}
            <a
              href="https://ico.org.uk"
              className="underline underline-offset-4"
            >
              ico.org.uk
            </a>
            .
          </p>
        </Section>

        <Section title="Cookies">
          <p className={P}>
            We use only strictly necessary cookies: the sign-in cookies that
            keep you signed in, for up to 7 days. No analytics, advertising or
            tracking cookies, so there&apos;s no cookie banner. Fonts are served
            from our own site, not Google.
          </p>
        </Section>

        <Section title="Age">
          <p className={P}>
            Oxformals is for people aged 18 or over. We don&apos;t knowingly
            collect data from anyone younger; if you think we have, email{" "}
            <Email /> and we&apos;ll delete it.
          </p>
        </Section>

        <Section title="Changes">
          <p className={P}>
            If we change this policy we&apos;ll update the date above. For
            significant changes we&apos;ll tell you by email or in the app
            first.
          </p>
        </Section>
      </article>
    </main>
  );
}
