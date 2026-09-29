"use client";

/**
 * First-party cookies that carry an invite or seat link through the Oxford
 * email sign-in (which can open in another tab). Read and cleared by
 * InviteClaimer once the person is signed in.
 */

export const INVITE_COOKIE = "oxf_invite";
export const SEAT_COOKIE = "oxf_seat";
const THIRTY_DAYS = 60 * 60 * 24 * 30;
const THREE_DAYS = 60 * 60 * 24 * 3;

export function readCookie(name: string): string | null {
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

export function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
}

export function clearCookie(name: string): void {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/** Remember an invite code with when it was first opened (kept if it's the same code). */
export function rememberInvite(code: string): void {
  if (readInvite()?.code === code) return;
  setCookie(INVITE_COOKIE, `${code}.${Date.now()}`, THIRTY_DAYS);
}

export function readInvite(): { code: string; openedAt: number } | null {
  const raw = readCookie(INVITE_COOKIE);
  if (!raw) return null;
  const [code, openedAt] = raw.split(".");
  const at = Number(openedAt);
  return code && Number.isFinite(at) ? { code, openedAt: at } : null;
}

export function rememberSeatLink(token: string): void {
  setCookie(SEAT_COOKIE, token, THREE_DAYS);
}
