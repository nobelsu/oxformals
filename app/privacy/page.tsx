export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <article className="space-y-8">
        <header className="space-y-2">
          <h1 className="font-display text-3xl uppercase tracking-[0.12em] text-[var(--ink)] sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Effective date: August 19, 2026
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Overview
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            Oxformals helps users discover, list, and request Oxford formal
            seats and connect with other students. This policy explains what we
            collect, why we collect it, and the controls available to you.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Information We Collect
          </h2>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed text-[var(--ink-muted)]">
            <li>Account details such as name, email, and college.</li>
            <li>
              Profile and listing content you create, including seat listings,
              swap requests, and message threads.
            </li>
            <li>
              Preference data such as notification settings and UI preferences.
            </li>
            <li>
              Basic technical data (for example IP address and
              device/browser information) used to operate and secure the
              service.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            How We Use Information
          </h2>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed text-[var(--ink-muted)]">
            <li>Provide core product features and account functionality.</li>
            <li>
              Match users with relevant listings, requests, and chat activity.
            </li>
            <li>Protect users, prevent abuse, and improve reliability.</li>
            <li>
              Send service communications and optional email notifications.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Public and In-App Visibility
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            Information shown in listings, requests, and chat may be visible to
            other users in order for the platform to function. Please avoid
            sharing sensitive personal information in listing text or messages.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Cookies and Tracking
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            Oxformals does not currently use non-essential advertising or
            profiling cookies on the public landing page. Essential
            authentication/session cookies may be used to keep signed-in
            accounts secure and functional.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Data Sharing
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            We do not sell personal data. We may share data with service
            providers that help us run Oxformals (for example hosting, auth,
            infrastructure, and security), and when required by law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Data Retention
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            We keep personal data only for as long as needed to provide the
            service, meet legal obligations, resolve disputes, and enforce our
            agreements. You can request account or data deletion by contacting
            us.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Your Rights
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            Depending on your location, you may have rights to access, correct,
            delete, or export your data, and to object to certain processing.
            Contact us to exercise these rights and we will respond in line with
            applicable law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-[var(--ink)]">
            Contact
          </h2>
          <p className="leading-relaxed text-[var(--ink-muted)]">
            Privacy requests and questions:{" "}
            <a
              href="mailto:privacy@oxformals.com"
              className="underline underline-offset-4"
            >
              privacy@oxformals.com
            </a>
          </p>
        </section>
      </article>
    </main>
  );
}
