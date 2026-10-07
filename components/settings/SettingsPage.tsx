"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAction, useConvex, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { CreditsInfoModal } from "@/components/credits/CreditsChip";
import { InviteFriendsButton } from "@/components/invites/InviteFriendsButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DeleteAccountModal } from "@/components/DeleteAccountModal";
import { PrivateAccountSetting } from "@/components/follows/PrivateAccountSetting";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { BlockedPeople } from "@/components/profile/BlockControls";
import { PasswordSettings } from "@/components/settings/PasswordSettings";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { Skeleton, SkeletonRows } from "@/components/ui/Loading";
import {
  setAppearancePref,
  useAppearancePref,
  type Appearance,
  type FontChoice,
  type TextSize,
} from "@/lib/hooks/useAppearance";

const SECTIONS = [
  { id: "account", label: "Account" },
  { id: "appearance", label: "Appearance" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy" },
  { id: "security", label: "Security" },
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

const BUTTON =
  "cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:cursor-default disabled:opacity-60";

/** "May 2026" */
function monthYear(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    month: "long",
    year: "numeric",
  }).format(new Date(ms));
}

/** Who you're signed in as, and signing out of this device. */
function SignInPanel({ email, memberSince }: { email: string; memberSince: number | undefined }) {
  const router = useRouter();
  const { signOut } = useAuth();
  return (
    <Panel title="Account">
      <p className="text-sm text-[var(--ink-muted)]">Signed in as</p>
      <p className="mt-0.5 truncate text-lg font-semibold">{email}</p>
      {memberSince === undefined ? (
        <Skeleton className="mt-2 h-3.5 w-40" />
      ) : (
        <p className="mt-1 text-sm text-[var(--ink-muted)]">Member since {monthYear(memberSince)}</p>
      )}
      <button
        type="button"
        onClick={() => void signOut().then(() => router.push("/"))}
        className={`${BUTTON} mt-5`}
      >
        Sign out
      </button>
    </Panel>
  );
}

/** Security: every other phone and browser signed in to this account. */
function OtherDevicesPanel() {
  const signOutOthers = useAction(api.account.signOutOtherDevices);
  const [confirming, setConfirming] = useState(false);
  const [others, setOthers] = useState<"idle" | "busy" | "done" | "error">("idle");
  return (
    <Panel
      title="Other devices"
      blurb="Sign out everywhere except here."
    >
      <button
        type="button"
        disabled={others === "busy"}
        onClick={() => setConfirming(true)}
        className={BUTTON}
      >
        Sign out of other devices
      </button>
      {others === "done" ? (
        <p role="status" className="mt-3 text-sm text-[var(--ink-muted)]">
          Signed out everywhere else.
        </p>
      ) : others === "error" ? (
        <p role="status" className="mt-3 text-sm text-[var(--danger)]">
          Couldn&apos;t do that. Try again.
        </p>
      ) : null}
      <ConfirmDialog
        open={confirming}
        message="Sign out of Oxformals on every other phone and browser?"
        confirmLabel="Sign out others"
        onConfirm={async () => {
          setConfirming(false);
          setOthers("busy");
          try {
            await signOutOthers({});
            setOthers("done");
          } catch {
            setOthers("error");
          }
        }}
        onCancel={() => setConfirming(false)}
      />
    </Panel>
  );
}

function CreditsPanel() {
  const credits = useQuery(api.credits.getMyCredits, {});
  const [open, setOpen] = useState(false);
  return (
    <Panel title="Spoons">
      {!credits ? (
        <Skeleton className="h-9 w-24" />
      ) : (
        <>
          <p className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold leading-none">{credits.balance}</span>
            <span className="text-sm text-[var(--ink-muted)]">
              spoon{credits.balance === 1 ? "" : "s"} to use
            </span>
          </p>
          {credits.spending + credits.earning > 0 ? (
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              {[
                credits.spending > 0 ? `${credits.spending} held for formals you've booked` : null,
                credits.earning > 0 ? `${credits.earning} on the way from hosting` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          <button type="button" onClick={() => setOpen(true)} className={`${BUTTON} mt-5`}>
            How spoons work
          </button>
          <CreditsInfoModal open={open} onClose={() => setOpen(false)} credits={credits} />
        </>
      )}
    </Panel>
  );
}

const DATA_SECTIONS = [
  ["profile", "Profile", "Your details, want-to-go list and badges"],
  ["formals", "Formals", "Listings, requests and attendance"],
  ["reviews", "Reviews", "Reviews and college tips you wrote"],
  ["social", "Social", "Follows, blocks, likes, comments and saves"],
  ["messages", "Messages", "Messages you sent"],
  ["credits", "Spoons and invites", "Your balance and invite code"],
  ["notifications", "Notifications", "What we've notified you about"],
] as const;
type DataSection = (typeof DATA_SECTIONS)[number][0];

/** Privacy: a JSON file of what Oxformals holds about you; pick the parts you want. */
function DataPanel() {
  const convex = useConvex();
  const [picked, setPicked] = useState<Set<DataSection>>(
    () => new Set(DATA_SECTIONS.map(([id]) => id)),
  );
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const toggle = (id: DataSection) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const all = picked.size === DATA_SECTIONS.length;

  return (
    <Panel title="Your data" blurb="Download a copy.">
      <div className="mb-1 flex justify-end">
        <button
          type="button"
          onClick={() => setPicked(all ? new Set() : new Set(DATA_SECTIONS.map(([id]) => id)))}
          className="cursor-pointer text-xs font-bold text-[var(--accent)] hover:underline"
        >
          {all ? "Clear all" : "Select all"}
        </button>
      </div>
      <ul>
        {DATA_SECTIONS.map(([id, label, note]) => (
          <li
            key={id}
            className="border-t-[1.5px] border-[color-mix(in_srgb,var(--ink)_10%,transparent)] first:border-t-0"
          >
            <label className="flex cursor-pointer items-center gap-3 py-3">
              <input
                type="checkbox"
                checked={picked.has(id)}
                onChange={() => toggle(id)}
                className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-[var(--ink)]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-sm text-[var(--ink-muted)]">{note}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={state === "busy" || picked.size === 0}
        onClick={async () => {
          setState("busy");
          try {
            const data = await convex.query(api.account.exportMyData, {
              sections: [...picked],
            });
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = `oxformals-data-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            setState("idle");
          } catch {
            setState("error");
          }
        }}
        className={`${BUTTON} mt-4`}
      >
        {state === "busy" ? "Preparing…" : "Download my data"}
      </button>
      {state === "error" ? (
        <p role="status" className="mt-3 text-sm text-[var(--danger)]">
          Couldn&apos;t prepare the file. Try again.
        </p>
      ) : null}
    </Panel>
  );
}

function InvitesPanel({ friendsJoined }: { friendsJoined: number | undefined }) {
  return (
    <Panel title="Invites">
      {friendsJoined === undefined ? (
        <Skeleton className="h-4 w-56" />
      ) : (
        <p className="text-sm text-[var(--ink-muted)]">
          {friendsJoined === 0
            ? "Nobody has joined through your invites yet."
            : `${friendsJoined} friend${friendsJoined === 1 ? " has" : "s have"} joined through your invites.`}
        </p>
      )}
      <InviteFriendsButton variant="plain" className="mt-5" />
    </Panel>
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
  const current = useAppearancePref("theme");
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
            onClick={() => setAppearancePref("theme", a.id)}
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

const FONTS: { id: FontChoice; label: string; note: string; family: string }[] = [
  {
    id: "default",
    label: "Oxformals",
    note: "Handwritten headings",
    family: 'var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "simple",
    label: "Simple",
    note: "Plain throughout",
    family: 'var(--font-inter), "Inter", ui-sans-serif, system-ui, sans-serif',
  },
  { id: "serif", label: "Serif", note: "Bookish", family: 'var(--font-lora), "Lora", ui-serif, Georgia, serif' },
  {
    id: "system",
    label: "This device",
    note: "Your device's own font",
    family: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  },
];

const SIZES: { id: TextSize; label: string; px: number }[] = [
  { id: "small", label: "Small", px: 14 },
  { id: "default", label: "Default", px: 16 },
  { id: "large", label: "Large", px: 18 },
  { id: "xlarge", label: "Largest", px: 20 },
];

const CHOICE = (on: boolean) =>
  `cursor-pointer rounded-[16px] border-2 p-3 text-left transition-colors ${
    on
      ? "border-[var(--ink)]"
      : "border-[color-mix(in_srgb,var(--ink)_14%,transparent)] hover:border-[color-mix(in_srgb,var(--ink)_40%,transparent)]"
  }`;

function FontSetting() {
  const current = useAppearancePref("font");
  return (
    <div role="radiogroup" aria-label="Font" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {FONTS.map((f) => (
        <button
          key={f.id}
          type="button"
          role="radio"
          aria-checked={current === f.id}
          onClick={() => setAppearancePref("font", f.id)}
          className={CHOICE(current === f.id)}
        >
          <span
            aria-hidden
            className="block text-3xl leading-none"
            style={{
              fontFamily:
                f.id === "default" ? 'var(--font-schoolbell), "Schoolbell", cursive' : f.family,
            }}
          >
            Aa
          </span>
          <span className="mt-3 block text-sm font-semibold" style={{ fontFamily: f.family }}>
            {f.label}
          </span>
          <span className="block text-xs text-[var(--ink-muted)]">{f.note}</span>
        </button>
      ))}
    </div>
  );
}

function TextSizeSetting() {
  const current = useAppearancePref("textSize");
  return (
    <div role="radiogroup" aria-label="Text size" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {SIZES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={current === t.id}
          onClick={() => setAppearancePref("textSize", t.id)}
          className={`${CHOICE(current === t.id)} flex flex-col justify-end`}
        >
          {/* Fixed px so each sample shows its own size, whatever is selected. */}
          <span aria-hidden className="block leading-none" style={{ fontSize: t.px * 1.6 }}>
            A
          </span>
          <span className="mt-3 block text-sm font-semibold">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 mt-7 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)] first:mt-0">
      {children}
    </h3>
  );
}

/** Settings as a page: sections down the left, one section's controls on the right. */
export function SettingsPage() {
  const searchParams = useSearchParams();
  const { user, status } = useAuth();
  const summary = useQuery(api.account.getMyAccountSummary, user ? {} : "skip");
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
              <SignInPanel email={user.email} memberSince={summary?.memberSince} />
              <CreditsPanel />
              <InvitesPanel friendsJoined={summary?.friendsJoined} />
              <Panel
                title="Delete account"
                
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
            <Panel title="Appearance">
              <SubHeading>Theme</SubHeading>
              <AppearanceSetting />
              <SubHeading>Font</SubHeading>
              <FontSetting />
              <SubHeading>Text size</SubHeading>
              <TextSizeSetting />
            </Panel>
          ) : section === "notifications" ? (
            <Panel title="Notifications">
              <NotificationSettings />
            </Panel>
          ) : section === "privacy" ? (
            <div className="flex flex-col gap-5">
              <Panel title="Privacy">
                <PrivateAccountSetting />
                <div className="mt-6 border-t-[1.5px] border-[color-mix(in_srgb,var(--ink)_10%,transparent)] pt-6">
                  <BlockedPeople />
                </div>
              </Panel>
              <DataPanel />
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <Panel title="Password">
                <PasswordSettings />
              </Panel>
              <OtherDevicesPanel />
            </div>
          )}
        </div>
      </div>

      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </main>
  );
}
