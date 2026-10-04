"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

/**
 * A Link for switching views inside `/` (the app's tabs and feed scopes).
 * `/` renders on the server per request, so a normal navigation waits on a
 * round trip before the new tab appears. On `/` itself this swaps the URL with
 * `history.pushState` instead, which Next syncs into `useSearchParams`, so the
 * tab switches at once and shows its own loading skeleton. Anywhere else it
 * behaves like a plain Link.
 */
export function ShallowLink({
  href,
  scroll = true,
  onClick,
  ...rest
}: ComponentProps<typeof Link> & { href: string }) {
  const pathname = usePathname();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || pathname !== "/" || !href.startsWith("/")) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const target = new URL(href, window.location.origin);
    if (target.pathname !== "/") return;
    e.preventDefault();
    window.history.pushState(null, "", `${target.pathname}${target.search}`);
    if (scroll) window.scrollTo({ top: 0 });
  };

  return <Link href={href} scroll={scroll} onClick={handleClick} {...rest} />;
}
