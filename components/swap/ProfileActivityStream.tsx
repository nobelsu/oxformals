"use client";

import { ProfileStreamRow } from "./ProfileStreamRow";
import {
  groupActivityByDay,
  type ProfileActivityItem,
} from "@/lib/data/groupActivityByDay";
import type { Listing } from "@/lib/data/types";
import type { User } from "@/lib/auth/types";

type Props = {
  items: ProfileActivityItem[];
  owner: User;
  memberUsersFor: (listing: Listing) => User[];
  onPress: (listing: Listing) => void;
  onRequest?: (listing: Listing) => void;
  disabled?: boolean;
  disabledLabel?: string;
  className?: string;
};

/**
 * The mixed Beli-style stream: day-labelled groups of stream cards,
 * newest first (ordering is owned by the getProfileActivity query).
 */
export function ProfileActivityStream({
  items,
  owner,
  memberUsersFor,
  onPress,
  onRequest,
  disabled,
  disabledLabel,
  className = "",
}: Props) {
  const groups = groupActivityByDay(items);
  return (
    <div className={className}>
      {groups.map((group) => (
        <section key={group.dateKey} aria-label={`${group.weekday} ${group.day}`}>
          <div className="font-display text-[1.1rem] text-[var(--ink-muted)]">
            {group.day}
          </div>
          <ul className="mt-2 flex flex-col gap-3">
            {group.items.map((item) =>
              item.kind === "listing" ? (
                <ProfileStreamRow
                  key={`listing-${item.listing.id}`}
                  item={item}
                  owner={owner}
                  memberUsers={memberUsersFor(item.listing)}
                  onPress={onPress}
                  onRequest={onRequest}
                  disabled={disabled}
                  disabledLabel={disabledLabel}
                />
              ) : (
                <ProfileStreamRow
                  key={`${item.kind}-${item.ts}-${item.college}`}
                  item={item}
                  owner={owner}
                  memberUsers={[]}
                  onPress={onPress}
                  disabled={disabled}
                  disabledLabel={disabledLabel}
                />
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
