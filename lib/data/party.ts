import type { SwapRequest } from "./types";

/** Seats a request asks for, not counting named friends who said "Not me". */
export function requestSeatCount(request: Pick<SwapRequest, "party">): number {
  return 1 + (request.party ?? []).filter((p) => p.response !== "out").length;
}

/** "+ 2 guests" / "+ Priya and 1 guest" style suffix; "" for a solo request. */
export function partySuffix(
  request: Pick<SwapRequest, "party">,
  nameOf: (userId: string) => string | undefined = () => undefined,
): string {
  const party = (request.party ?? []).filter((p) => p.response !== "out");
  if (party.length === 0) return "";
  const friends = party
    .filter((p) => p.kind === "friend" && p.userId)
    .map((p) => nameOf(p.userId!)?.split(" ")[0] ?? "a friend");
  const guests = party.filter((p) => p.kind === "guest").length;
  const parts = [
    ...friends,
    ...(guests > 0 ? [`${guests} guest${guests === 1 ? "" : "s"}`] : []),
  ];
  const joined =
    parts.length <= 1
      ? parts.join("")
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `+ ${joined}`;
}
