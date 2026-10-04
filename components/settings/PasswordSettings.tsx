"use client";

import { useState, type FormEvent } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/Loading";

const FIELD =
  "w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--paper)] px-4 py-2.5 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none disabled:opacity-60";
const PRIMARY =
  "cursor-pointer rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60";
const DANGER =
  "cursor-pointer rounded-full bg-[var(--danger)] px-5 py-2 text-sm font-semibold text-[var(--danger-ink)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
const QUIET =
  "cursor-pointer text-sm font-semibold text-[var(--ink-muted)] underline-offset-4 transition-colors hover:text-[var(--ink)] hover:underline";

type Mode = "menu" | "set" | "change" | "reset" | "remove";

const OPTION =
  "flex w-full cursor-pointer items-center justify-between gap-4 border-t-[1.5px] border-[color-mix(in_srgb,var(--ink)_10%,transparent)] py-4 text-left first:border-t-0 first:pt-0 last:pb-0 disabled:opacity-60";

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/**
 * Password: set one, change it (with the current one), reset it with a code
 * emailed to you when you've forgotten it, or remove it.
 */
export function PasswordSettings() {
  const { user, hasPassword, setPassword, requestCode, verifyCode } = useAuth();
  const changePassword = useAction(api.password.changePassword);
  const resetPassword = useAction(api.password.resetPassword);
  const removePassword = useAction(api.password.removePassword);

  const [mode, setMode] = useState<Mode>("menu");
  const [current, setCurrent] = useState("");
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (!user || hasPassword === undefined) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-11 w-full rounded-full" />
        <Skeleton className="h-11 w-full rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
    );
  }

  const clear = () => {
    setCurrent("");
    setCode("");
    setNext("");
    setConfirm("");
  };

  const checkNew = (): boolean => {
    if (next.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    if (next !== confirm) {
      setError("Passwords don't match.");
      return false;
    }
    return true;
  };

  const startReset = async () => {
    setError(null);
    setDone(null);
    setBusy(true);
    try {
      await requestCode(user.email);
      clear();
      setMode("reset");
    } catch {
      setError("Couldn't send the code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setDone(null);
    if (mode !== "remove" || !hasPassword) {
      if (!checkNew()) return;
    }
    setBusy(true);
    try {
      if (hasPassword && mode === "remove") {
        if ((await removePassword({ current })) === "wrong_password") {
          setError("That isn't your current password.");
          return;
        }
        setMode("menu");
        setDone("Password removed. You'll sign in with an email code from now on.");
      } else if (!hasPassword) {
        await setPassword(next);
        setMode("menu");
        setDone("Password set.");
      } else if (mode === "change") {
        if ((await changePassword({ current, next })) === "wrong_password") {
          setError("That isn't your current password.");
          return;
        }
        setMode("menu");
        setDone("Password changed. Your other devices have been signed out.");
      } else {
        try {
          await verifyCode(user.email, code);
        } catch {
          setError("That code didn't work. Check it, or send a new one.");
          return;
        }
        // The new session can take a moment to reach the server.
        let result = await resetPassword({ next });
        for (let i = 0; i < 3 && result === "stale_session"; i++) {
          await sleep(500);
          result = await resetPassword({ next });
        }
        if (result !== "ok") {
          setError("Couldn't reset your password. Send a new code and try again.");
          return;
        }
        setMode("menu");
        setDone("Password reset. Your other devices have been signed out.");
      }
      clear();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const open = (next: Mode) => {
    setError(null);
    setDone(null);
    clear();
    setMode(next);
  };

  if (mode === "menu") {
    const option = (label: string, note: string, onClick: () => void, danger = false) => (
      <button type="button" disabled={busy} onClick={onClick} className={OPTION}>
        <span className="min-w-0">
          <span className={`block text-sm font-semibold ${danger ? "text-[var(--danger)]" : ""}`}>
            {label}
          </span>
          <span className="block text-sm text-[var(--ink-muted)]">{note}</span>
        </span>
        <ChevronRightIcon className="text-[var(--ink-soft)]" />
      </button>
    );
    return (
      <div>
        {done ? <p className="mb-4 text-sm text-[var(--ink-muted)]">{done}</p> : null}
        {error ? <p className="mb-4 text-sm text-[var(--danger)]">{error}</p> : null}
        {!hasPassword ? (
          option("Set a password", "Skip the email code next time you sign in.", () => open("set"))
        ) : (
          <>
            {option("Change password", "You'll need your current password.", () => open("change"))}
            {option(
              "Forgot your password?",
              `We'll email a code to ${user.email} so you can set a new one.`,
              () => void startReset(),
            )}
            {option(
              "Remove password",
              "Go back to signing in with an email code.",
              () => open("remove"),
              true,
            )}
          </>
        )}
      </div>
    );
  }

  const heading =
    mode === "set"
      ? "Set a password"
      : mode === "change"
        ? "Change password"
        : mode === "reset"
          ? "Reset password"
          : "Remove password";

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3">
      <div className="mb-1">
        <button type="button" disabled={busy} onClick={() => open("menu")} className={QUIET}>
          <ChevronLeftIcon /> Back
        </button>
        <h3 className="mt-2 text-base font-semibold">{heading}</h3>
      </div>
      {/* Lets password managers attach the new password to the right account. */}
      <input type="email" autoComplete="username" value={user.email} readOnly hidden />
      {!hasPassword ? (
        <p className="text-sm text-[var(--ink-muted)]">
          Set a password to skip the email code next time you sign in.
        </p>
      ) : mode !== "reset" ? (
        <>
        {mode === "remove" ? (
          <p className="text-sm text-[var(--ink-muted)]">
            Enter your password to remove it. You&apos;ll sign in with an email code instead.
          </p>
        ) : null}
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current password"
          disabled={busy}
          className={FIELD}
        />
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--ink-muted)]">
            We emailed a code to {user.email}. Enter it with your new password.
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code from the email"
            disabled={busy}
            className={FIELD}
          />
        </>
      )}
      {hasPassword && mode === "remove" ? null : (
        <>
      <input
        type="password"
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder="New password (8+ characters)"
        disabled={busy}
        className={FIELD}
      />
      <input
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm new password"
        disabled={busy}
        className={FIELD}
      />
        </>
      )}
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {done ? <p className="text-sm text-[var(--ink-muted)]">{done}</p> : null}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className={hasPassword && mode === "remove" ? DANGER : PRIMARY}
        >
          {busy
            ? "Saving…"
            : !hasPassword
              ? "Set password"
              : mode === "change"
                ? "Change password"
                : mode === "reset"
                  ? "Reset password"
                  : "Remove password"}
        </button>
        {hasPassword && mode === "reset" ? (
          <button type="button" disabled={busy} onClick={() => void startReset()} className={QUIET}>
            Send a new code
          </button>
        ) : null}
      </div>
    </form>
  );
}
