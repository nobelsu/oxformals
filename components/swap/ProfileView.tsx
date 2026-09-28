"use client";

import { BioText } from "@/components/profile/BioText";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ListingWithMenuPdfUrl } from "@/convex/listingHelpers";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Avatar, PRESET_AVATARS, PresetAvatarIcon, initialsFor } from "@/components/ui/Avatar";
import { SketchCard } from "@/components/ui/SketchCard";
import { ListingDetailModal } from "@/components/swap/ListingDetailModal";
import { JoinRequestFlow } from "@/components/swap/JoinRequestFlow";
import { MessageUserButton } from "@/components/chat/MessageUserButton";
import { ProfileActivityStream } from "./ProfileActivityStream";
import { BadgeCaseModal } from "./BadgeCaseModal";
import { BadgeArt } from "@/components/badges/BadgeArt";
import {
  FollowButton,
  FollowCounts,
  PrivateActivityNotice,
} from "@/components/follows/FollowControls";
import { DEFAULT_UI_FONT } from "@/convex/uiFont";
import type { AvatarSource } from "@/lib/auth/types";
import type { GroupSize, Listing } from "@/lib/data/types";
import { formatYearLabel } from "@/lib/data/format";
import { TOTAL_BADGE_COUNT, badgeById } from "@/lib/data/badges";
import type { ProfileActivityItem } from "@/lib/data/groupActivityByDay";

function mapProfileListing(doc: {
  _id: string;
  _creationTime: number;
  ownerUserId: string;
  college: string;
  dateTime: string;
  groupSize: GroupSize;
  seatsAvailable: number;
  members: string[];
  year: string;
  role: string;
  message: string;
  menu?: string;
  menuPdfUrl?: string | null;
  menuFileContentType?: string | null;
  listingType?: "swap" | "pay" | "both";
  formalType?: "matchmaking" | "social" | "networking";
  price?: number;
  status: "active" | "confirmed" | "closed" | "expired";
}): Listing {
  return {
    id: doc._id,
    ownerUserId: doc.ownerUserId,
    college: doc.college,
    dateTime: doc.dateTime,
    groupSize: doc.groupSize,
    seatsAvailable: doc.seatsAvailable,
    members: doc.members,
    year: doc.year,
    role: doc.role,
    message: doc.message,
    menu: doc.menu ?? "",
    ...(doc.menuPdfUrl ? { menuPdfUrl: doc.menuPdfUrl } : {}),
    ...(doc.menuFileContentType
      ? { menuFileContentType: doc.menuFileContentType }
      : {}),
    listingType: doc.listingType ?? "swap",
    formalType: doc.formalType ?? "social",
    ...(doc.price !== undefined ? { price: doc.price } : {}),
    status: doc.status,
    createdAt: doc._creationTime,
  };
}

function AvatarLightbox({
  source,
  name,
  onClose,
}: {
  source?: AvatarSource;
  name: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const largeCls =
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_18%,var(--bg))] text-[var(--ink-muted)] border-[3px] border-[var(--ink)] h-56 w-56 text-5xl";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[var(--ink)]/30 backdrop-blur-sm" />
      <div
        className={largeCls}
        onClick={(e) => e.stopPropagation()}
      >
        {source?.kind === "image" ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={source.dataUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : source?.kind === "preset" &&
          PRESET_AVATARS.some((p) => p.id === source.id) ? (
          <PresetAvatarIcon id={source.id} className="h-[1em] w-[1em] text-7xl" />
        ) : (
          <span className="select-none">{initialsFor(name)}</span>
        )}
      </div>
    </div>,
    document.body,
  );
}

type ProfileViewProps = {
  userId: string;
  /** When true, omit back link and outer page chrome (for Me tab). */
  embedded?: boolean;
  /** Own profile in Me tab: open in-tab edit instead of navigating away. */
  onEditProfile?: () => void;
};

const STANDALONE_OUTER =
  "mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6";
const EMBEDDED_OUTER = "flex w-full flex-col gap-8";

export function ProfileView({
  userId,
  embedded = false,
  onEditProfile,
}: ProfileViewProps) {
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { getUser } = useData();
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [joinTarget, setJoinTarget] = useState<Listing | null>(null);
  const [badgeCaseOpen, setBadgeCaseOpen] = useState(false);
  const closeAvatar = useCallback(() => setAvatarOpen(false), []);

  const profile = useQuery(api.users.getPublicProfile, {
    userId: userId as Id<"users">,
  });

  const activity = useQuery(api.profileActivity.getProfileActivity, {
    userId: userId as Id<"users">,
  });
  const earnedBadges = useQuery(api.badges.getUserBadges, {
    userId: userId as Id<"users">,
  });
  const followState = useQuery(api.follows.getFollowState, {
    userId: userId as Id<"users">,
  });
  const badgeProgress = useQuery(
    api.badges.getBadgeProgress,
    badgeCaseOpen ? { userId: userId as Id<"users"> } : "skip",
  );

  const handleRequestClick = useCallback(
    (listing: Listing) => {
      if (!isAuthenticated) {
        router.push(
          `/login?next=${encodeURIComponent(`/profile/${userId}`)}`,
        );
        return;
      }
      setJoinTarget(listing);
    },
    [isAuthenticated, router, userId],
  );

  const Outer = embedded ? "div" : "main";
  const outerClass = embedded ? EMBEDDED_OUTER : STANDALONE_OUTER;

  if (profile === undefined) {
    const loadingClass = embedded
      ? "flex min-h-[50vh] w-full items-center justify-center"
      : "mx-auto flex min-h-[50vh] w-full max-w-5xl items-center justify-center px-4 py-8 sm:px-6";
    return (
      <Outer className={loadingClass}>
        <span className="inline-flex items-center gap-3 rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-6 py-3 text-base text-[var(--ink)]">
          <span
            aria-hidden="true"
            className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--ink-soft)] border-t-[var(--ink)]"
          />
          Loading...
        </span>
      </Outer>
    );
  }

  if (profile === null) {
    const notFoundClass = embedded
      ? "w-full"
      : "mx-auto w-full max-w-5xl px-4 py-8 sm:px-6";
    return (
      <Outer className={notFoundClass}>
        <SketchCard seed={3} className="p-8">
          <h2 className="font-display text-3xl uppercase tracking-wide">
            User not found
          </h2>
          <p className="mt-2 text-[var(--ink-muted)]">
            This profile does not exist.
          </p>
          {!embedded ? (
            <Link
              href="/"
              className="mt-5 inline-flex rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
            >
              Back to Browse
            </Link>
          ) : null}
        </SketchCard>
      </Outer>
    );
  }

  const { user: profileUser } = profile;
  const name = profileUser.name ?? "Anonymous";
  const college = profileUser.college ?? "";
  const year = profileUser.year ?? "";
  const role = profileUser.role ?? "";
  const interests = profileUser.interests ?? [];
  const instagramHandle = (profileUser.instagramHandle ?? "").replace(/^@+/, "");
  const whatsappPhone = (profileUser.whatsappPhone ?? "").trim();
  const dietaryRequirements = (profileUser.dietaryRequirements ?? "").trim();
  const subject = (profileUser.subject ?? "").trim();
  const avatar = profileUser.avatar as AvatarSource | undefined;

  const profileLine = [
    college,
    formatYearLabel(year) || year,
    role,
  ]
    .filter(Boolean)
    .join(" · ");

  const isOwnProfile = currentUser?.id === userId;
  const listingDisabled = isOwnProfile || !isAuthenticated;

  const ownerAsUser = {
    id: profileUser._id,
    email: "",
    name,
    college,
    year,
    role,
    interests,
    bio: profileUser.bio ?? "",
    subject,
    uiFont: profileUser.uiFont ?? DEFAULT_UI_FONT,
    avatar,
  };

  const editProfileClass =
    "shrink-0 cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]";

  const stats = activity?.stats;
  // The query returns raw enriched listing docs; ListingRow needs the
  // client-mapped `Listing` shape (id/createdAt/formalType defaults), so
  // listing items go through the existing mapProfileListing helper.
  const streamItems = ((activity?.items ?? []) as ProfileActivityItem[]).map(
    (item) =>
      item.kind === "listing"
        ? {
            kind: "listing" as const,
            ts: item.ts,
            // The wire value is the enriched listing doc, not the mapped
            // `Listing` the union type claims.
            listing: mapProfileListing(
              item.listing as unknown as ListingWithMenuPdfUrl,
            ),
          }
        : item,
  );
  const earnedCount = earnedBadges?.length ?? 0;
  // Most recent first; up to three sit next to the name.
  const recentBadges = [...(earnedBadges ?? [])]
    .sort((x, y) => y.earnedAt - x.earnedAt)
    .map((b) => badgeById(b.badgeId))
    .filter((def): def is NonNullable<typeof def> => def !== undefined)
    .slice(0, 3);
  const memberUsersFor = (l: Listing) =>
    l.members
      .filter((mid) => mid !== l.ownerUserId)
      .map(getUser)
      .filter((u): u is NonNullable<typeof u> => !!u);

  return (
    <Outer className={outerClass}>
      {!embedded ? (
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            Back to Browse
          </Link>
        </div>
      ) : null}

      {/* Header — left-aligned compact */}
      <div className="flex items-center gap-3.5">
        <div
          role="button"
          tabIndex={0}
          className="shrink-0 cursor-pointer transition-transform hover:scale-105"
          onClick={() => setAvatarOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setAvatarOpen(true);
            }
          }}
          aria-label={`View ${name}'s avatar`}
        >
          <Avatar name={name} size="lg" source={avatar} />
        </div>
        {avatarOpen && (
          <AvatarLightbox source={avatar} name={name} onClose={closeAvatar} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="font-display text-[1.75rem] leading-tight">
              {name}
            </h1>
            {recentBadges.length > 0 ? (
              <button
                type="button"
                onClick={() => setBadgeCaseOpen(true)}
                aria-label={`Badges, ${earnedCount} of ${TOTAL_BADGE_COUNT} earned. Open badge case.`}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full py-0.5 pr-1 transition-opacity hover:opacity-80"
              >
                {recentBadges.map((def) => (
                  <span key={def.id} title={def.name} className="flex">
                    <BadgeArt def={def} earned size={30} />
                  </span>
                ))}
                {earnedCount > recentBadges.length ? (
                  <span className="ml-0.5 text-sm text-[var(--ink-muted)]">
                    +{earnedCount - recentBadges.length}
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
          {profileLine ? (
            <p className="mt-0.5 text-sm text-[var(--ink-soft)]">{profileLine}</p>
          ) : null}
          {followState ? (
            <div className="mt-1">
              <FollowCounts userId={userId} state={followState} />
            </div>
          ) : null}
        </div>
        {isOwnProfile ? (
          onEditProfile ? (
            <button type="button" onClick={onEditProfile} className={editProfileClass}>
              Edit
            </button>
          ) : (
            <Link href="/?tab=mine&edit=1" className={editProfileClass}>
              Edit
            </Link>
          )
        ) : isAuthenticated ? (
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            {followState ? (
              <FollowButton userId={userId} name={name} state={followState} />
            ) : null}
            <MessageUserButton
              otherUserId={userId as Id<"users">}
              className="shrink-0 cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-50"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              router.push(
                `/login?next=${encodeURIComponent(`/profile/${userId}`)}`,
              )
            }
            className="shrink-0 cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            Message
          </button>
        )}
      </div>

      <BioText
        bio={profileUser.bio ?? ""}
        userId={userId}
        canReport={isAuthenticated && !isOwnProfile}
        className="-mt-3"
      />

      {(instagramHandle || whatsappPhone) && (
        <div className="flex flex-wrap gap-2">
          {instagramHandle && (
            <a
              href={`https://instagram.com/${instagramHandle}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 max-w-full min-w-0 items-center gap-1.5 rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--ink)_35%,transparent)] px-3 text-[0.85rem] text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
              <span className="truncate">@{instagramHandle}</span>
            </a>
          )}
          {whatsappPhone && (
            <a
              href={`https://wa.me/${whatsappPhone.replace(/[^\d+]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 max-w-full min-w-0 items-center gap-1.5 rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--ink)_35%,transparent)] px-3 text-[0.85rem] text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="truncate">{whatsappPhone}</span>
            </a>
          )}
        </div>
      )}

      {(dietaryRequirements || subject) && (
        <div className="-mt-4 space-y-0.5 text-sm text-[var(--ink-muted)]">
          {dietaryRequirements ? (
            <p>
              <span className="font-medium text-[var(--ink)]">
                Allergens / Dietary requirements:
              </span>{" "}
              {dietaryRequirements}
            </p>
          ) : null}
          {subject ? (
            <p>
              <span className="font-medium text-[var(--ink)]">Subject:</span>{" "}
              {subject}
            </p>
          ) : null}
        </div>
      )}

      {/* Stat strip */}
      <div className="flex items-baseline gap-6">
        <span className="text-[1.05rem]">
          <span className="font-extrabold text-[var(--accent)]">
            {stats ? stats.activeCount : "–"}
          </span>{" "}
          <span className="text-[0.75rem] uppercase tracking-[0.05em] text-[var(--ink-muted)]">
            active
          </span>
        </span>
        <span className="text-[1.05rem]">
          <span className="font-extrabold">{stats && !activity?.hidden ? stats.reviewCount : "–"}</span>{" "}
          <span className="text-[0.75rem] uppercase tracking-[0.05em] text-[var(--ink-muted)]">
            reviews
          </span>
        </span>
        <span className="text-[1.05rem]">
          <span className="font-extrabold">{stats && !activity?.hidden ? stats.attendedCount : "–"}</span>{" "}
          <span className="text-[0.75rem] uppercase tracking-[0.05em] text-[var(--ink-muted)]">
            formals
          </span>
        </span>
      </div>

      {/* Activity stream */}
      <section aria-label="Activity">
        <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          Activity
        </h2>
        {activity === undefined ? (
          <p className="mt-3 text-[var(--ink-muted)]">Loading activity…</p>
        ) : activity.hidden && streamItems.length === 0 ? (
          <PrivateActivityNotice
            name={name}
            pending={followState?.following === "pending"}
          />
        ) : streamItems.length === 0 ? (
          <div className="mt-3 rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_25%,transparent)] px-5 py-8 text-center text-[var(--ink-muted)]">
            {isOwnProfile
              ? "No activity yet — list a formal to get started."
              : `${name.split(" ")[0]} hasn\u2019t been active yet.`}
          </div>
        ) : (
          <ProfileActivityStream
            className="mt-3"
            items={streamItems}
            owner={ownerAsUser}
            memberUsersFor={memberUsersFor}
            onPress={(l) => setDetailListing(l)}
            onRequest={
              isOwnProfile ? undefined : (l) => handleRequestClick(l)
            }
            disabled={listingDisabled}
            disabledLabel={
              isOwnProfile
                ? "Your listing"
                : !isAuthenticated
                  ? "Sign in to request"
                  : undefined
            }
          />
        )}
        {activity?.hidden && streamItems.length > 0 ? (
          <PrivateActivityNotice
            name={name}
            pending={followState?.following === "pending"}
          />
        ) : null}
      </section>

      <BadgeCaseModal
        open={badgeCaseOpen}
        onClose={() => setBadgeCaseOpen(false)}
        earned={earnedBadges}
        progress={badgeProgress}
      />

      <ListingDetailModal
        open={!!detailListing}
        onClose={() => setDetailListing(null)}
        listing={detailListing}
        owner={detailListing ? ownerAsUser : null}
        memberUsers={
          detailListing
            ? detailListing.members
                .filter((mid) => mid !== detailListing.ownerUserId)
                .map(getUser)
                .filter((u): u is NonNullable<typeof u> => !!u)
            : []
        }
        onRequest={() => {
          if (detailListing) handleRequestClick(detailListing);
        }}
        disabled={listingDisabled}
        disabledLabel={
          isOwnProfile
            ? "Your listing"
            : !isAuthenticated
              ? "Sign in to request"
              : undefined
        }
      />

      <JoinRequestFlow target={joinTarget} onClose={() => setJoinTarget(null)} />
    </Outer>
  );
}
