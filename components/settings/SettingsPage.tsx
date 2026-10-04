"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { DeleteAccountModal } from "@/components/DeleteAccountModal";
import { PrivateAccountSetting } from "@/components/follows/PrivateAccountSetting";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { PasswordSettings } from "@/components/settings/PasswordSettings";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { Skeleton, SkeletonRows } from "@/components/ui/Loading";
import { setAppearance, useAppearance, type Appearance } from "@/lib/hooks/useAppearance";

const SECTIONS = [
  { id: "account", label: "Account" },
  { id: "appearance", label: "Appearance" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy" },
  { id: "security", label: "Password" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const isSection = (x: string | null): x is SectionId =>
  SECTIONS.some((s) => s.id === x);

const CARD =
  "rounded-[20px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] p-5 sm:p-6";

function Panel({ title, blurb, children }: { title: string; blurb?: string; children: ReactNode }) {
  return (
    <section className={CARD}>
      <h2 className="font-display text-2xl uppercase tracking-wide">{title}</h2>
      {blurb ? <p className="mt-1 text-sm text-[var(--ink-muted)]">{blurb}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const ROW =
  "flex items-center justify-between gap-4 border-t-[1.5px] border-[color-mix(in_srgb,var(--ink)_10%,transparent)] py-3.5 first:border-t-0 first:pt-0";

/** A detail you change in the profile editor: the whole row is the link. */
function EditableRow({ label, value }: { label: string; value: string }) {
  return (
    <Link href="/?tab=mine&edit=1" className={`${ROW} group/row`}>
      <span className="text-sm text-[var(--ink-muted)]">{label}</span>
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <span className="truncate">{value}</span>
        <span className="shrink-0 text-xs font-bold text-[var(--accent)] group-hover/row:underline">
          Edit
        </span>
        <ChevronRightIcon className="text-[var(--ink-soft)]" />
      </span>
    </Link>
  );
}

/** A detail that can't be changed, with why. */
function FixedRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className={ROW}>
      <span className="text-sm text-[var(--ink-muted)]">{label}</span>
      <span className="min-w-0 text-right">
        <span className="block truncate text-sm">{value}</span>
        <span className="block text-xs text-[var(--ink-soft)]">{note}</span>
      </span>
    </div>
  );
}

const APPEARANCES: { id: Appearance; label: string; note: string }[] = [
  { id: "system", label: "System", note: "Match this device" },
  { id: "light", label: "Light", note: "Warm paper" },
  { id: "dark", label: "Dark", note: "Easier at night" },
];

/** A tiny page in each palette; System shows both halves. */
function Swatch({ id }: { id: Appearance }) {
  const half = (dark: boolean) => (
    <span
      className="flex flex-1 flex-col justify-center gap-1.5 px-3"
      style={{ background: dark ? "#1a1810" : "#f2ecdd" }}
    >
      <span className="h-1.5 w-8 rounded-full" style={{ background: dark ? "#f2ecdd" : "#1b1a12" }} />
      <span className="h-1.5 w-12 rounded-full" style={{ background: dark ? "#8f8875" : "#716b55" }} />
      <span className="h-3 w-7 rounded-full" style={{ background: dark ? "#d9736c" : "#b8524c" }} />
    </span>
  );
  return (
    <span className="flex h-20 overflow-hidden rounded-[12px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)]">
      {id === "system" ? (
        <>
          {half(false)}
          {half(true)}
        </>
      ) : (
        half(id === "dark")
      )}
    </span>
  );
}

function AppearanceSetting() {
  const current = useAppearance();
  return (
    <div role="radiogroup" aria-label="Appearance" className="grid gap-3 sm:grid-cols-3">
      {APPEARANCES.map((a) => {
        const on = current === a.id;
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setAppearance(a.id)}
            className={`flex cursor-pointer flex-col gap-3 rounded-[16px] border-2 p-3 text-left transition-colors ${
              on
                ? "border-[var(--ink)]"
                : "border-[color-mix(in_srgb,var(--ink)_14%,transparent)] hover:border-[color-mix(in_srgb,var(--ink)_40%,transparent)]"
            }`}
          >
            <Swatch id={a.id} />
            <span className="flex items-center gap-2.5 px-1 pb-0.5">
              <span
                aria-hidden
                className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] ${
                  on ? "bg-[var(--ink)]" : ""
                }`}
              >
                {on ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--paper)]" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{a.label}</span>
                <span className="block text-xs text-[var(--ink-muted)]">{a.note}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Settings as a page: sections down the left, one section's controls on the right. */
export function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, status, signOut } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const param = searchParams.get("section");
  const section: SectionId = isSection(param) ? param : "account";

  const go = (id: SectionId) =>
    window.history.replaceState(null, "", id === "account" ? "/settings" : `/settings?section=${id}`);

  const navCls = (on: boolean) =>
    `shrink-0 cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-left text-sm transition-colors md:w-full ${
      on
        ? "bg-[var(--ink)] font-semibold text-[var(--bg)]"
        : "text-[var(--ink-muted)] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] hover:text-[var(--ink)]"
    }`;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
      >
        <ChevronLeftIcon /> Back to feed
      </Link>
      <h1 className="mt-2 font-display text-3xl uppercase tracking-wide sm:text-4xl">Settings</h1>

      <div className="mt-6 flex flex-col gap-5 md:flex-row md:gap-8">
        <nav
          aria-label="Settings sections"
          className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:w-48 md:shrink-0 md:flex-col md:overflow-visible md:px-0"
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-current={section === s.id ? "page" : undefined}
              onClick={() => go(s.id)}
              className={navCls(section === s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {status !== "ready" || !user ? (
            <div className={CARD}>
              <Skeleton className="h-7 w-40" />
              <SkeletonRows className="mt-6" count={3} avatar={false} />
            </div>
          ) : section === "account" ? (
            <div className="flex flex-col gap-5">
              <Panel title="Account">
                <EditableRow label="Name" value={user.name} />
                <EditableRow label="College" value={user.college} />
                <FixedRow
                  label="Email"
                  value={user.email}
                  note="Your Oxford email is how you sign in, so it can't be changed."
                />
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => void signOut().then(() => router.push("/"))}
                    className="cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
                  >
                    Sign out
                  </button>
                </div>
              </Panel>
              <Panel
                title="Delete account"
                blurb="You'll see exactly what gets removed before you confirm."
              >
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="cursor-pointer rounded-full border-[2px] border-[var(--danger)] px-4 py-1.5 text-sm font-semibold text-[var(--danger)] transition-colors hover:bg-[var(--danger)] hover:text-[var(--danger-ink)]"
                >
                  Delete account
                </button>
              </Panel>
            </div>
          ) : section === "appearance" ? (
            <Panel title="Appearance" blurb="Applies on this device.">
              <AppearanceSetting />
            </Panel>
          ) : section === "notifications" ? (
            <Panel title="Notifications" blurb="Choose what reaches you by push and by email.">
              <NotificationSettings />
            </Panel>
          ) : section === "privacy" ? (
            <Panel title="Privacy">
              <PrivateAccountSetting />
            </Panel>
          ) : (
            <Panel title="Password">
              <PasswordSettings />
            </Panel>
          )}
        </div>
      </div>

      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </main>
  );
}
