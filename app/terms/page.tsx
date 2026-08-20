export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <article className="space-y-8">
        <header className="space-y-2">
          <h1 className="font-display text-3xl uppercase tracking-[0.12em] text-[var(--ink)] sm:text-4xl">
            Terms of Service
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Effective date: August 19, 2026
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Acceptance
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            By using Oxformals, you agree to these Terms. If you do not agree,
            do not use the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Eligibility and Accounts
          </h2>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed text-[var(--ink-muted)]">
            <li>You must provide accurate account information.</li>
            <li>You are responsible for activity on your account.</li>
            <li>
              You must keep your login credentials secure and notify us of
              unauthorized use.
            </li>
            <li>
              You are responsible for ensuring your use of the platform complies
              with your college and event rules.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Platform Use
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            Oxformals provides listing, request, and messaging tools for formal
            events. You agree not to misuse the platform, interfere with its
            operation, or use it for fraud, harassment, impersonation, spam, or
            illegal activity.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Listings, Requests, and Transactions
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            Users are responsible for the accuracy of listings and requests they
            post, and for communications they exchange with other users.
            Oxformals provides platform tools, but is not a party to agreements
            made directly between users.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            User Content
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            You retain ownership of content you post. You grant Oxformals a
            license to host, display, and process that content solely to operate
            and improve the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Moderation and Suspension
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            We may remove content or suspend accounts that violate these Terms
            or create safety, legal, integrity, or operational risks.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Disclaimers
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            The service is provided &quot;as is&quot; without warranties of any
            kind. We do not guarantee uninterrupted availability or error-free
            operation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Limitation of Liability
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            To the maximum extent permitted by law, Oxformals is not liable for
            indirect, incidental, special, consequential, or punitive damages
            arising from your use of the service, including interactions between
            users.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Changes
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            We may update these Terms from time to time. Continued use of
            Oxformals after updates means you accept the revised Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Contact
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            Terms questions:{" "}
            <a
              href="mailto:legal@oxformals.com"
              className="underline underline-offset-4"
            >
              legal@oxformals.com
            </a>
          </p>
        </section>
      </article>
    </main>
  );
}
