"use client";

import { formatYearRole } from "@/lib/data/roles";
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
import { CollegeCrest } from "@/components/colleges/CollegeCrest";
import { ShareProfileButton } from "@/components/profile/ShareProfileButton";
import { collegeToSlug } from "@/lib/data/collegeSlug";
import {
  FollowButton,
  FollowTags,
  PrivateActivityNotice,
  ProfileCounts,
} from "@/components/follows/FollowControls";
import { DEFAULT_UI_FONT } from "@/convex/uiFont";
import type { AvatarSource } from "@/lib/auth/types";
import type { GroupSize, Listing } from "@/lib/data/types";
import { TOTAL_BADGE_COUNT, badgeById } from "@/lib/data/badges";
import type { ProfileActivityItem } from "@/lib/data/groupActivityByDay";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonRows } from "@/components/ui/Loading";
import { InviteFriendsButton } from "@/components/invites/InviteFriendsButton";

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
  "mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:px-6";
const EMBEDDED_OUTER = "mx-auto flex w-full max-w-xl flex-col gap-6";

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
        <div className="flex w-full flex-col gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-full" />
          <SkeletonRows count={2} />
        </div>
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
          {!embedded ? (
            <Link
              href="/"
              className="mt-5 inline-flex rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
            >
              Back
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
  const wishlist = (profileUser as { wishlistColleges?: string[] }).wishlistColleges ?? [];

  const profileLine = [
    college,
    formatYearRole(year, role),
    subject,
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
    "flex-1 cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-center text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]";

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
    .slice(0, 5);
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
          </div>
          {profileLine ? (
            <p className="mt-0.5 text-sm text-[var(--ink-soft)]">{profileLine}</p>
          ) : null}
          {followState ? <FollowTags state={followState} /> : null}
        </div>
      </div>

      <BioText
        bio={profileUser.bio ?? ""}
        userId={userId}
        canReport={isAuthenticated && !isOwnProfile}
        className="-mt-3"
      />

      {instagramHandle || whatsappPhone || dietaryRequirements ? (
        <div className="-mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--ink-muted)]">
          {whatsappPhone ? (
            <a
              href={`https://wa.me/${whatsappPhone.replace(/[^\d+]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-[var(--ink)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
                <path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z" />
              </svg>
              {whatsappPhone}
            </a>
          ) : null}
          {instagramHandle ? (
            <a
              href={`https://instagram.com/${instagramHandle}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-[var(--ink)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
              </svg>
              @{instagramHandle}
            </a>
          ) : null}
          {dietaryRequirements ? (
            <span className="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-2 6 0 8v10" />
              </svg>
              {dietaryRequirements}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="-mt-2 flex flex-col gap-3">
        {followState ? (
          <ProfileCounts
            userId={userId}
            state={followState}
            formals={stats && !activity?.hidden ? stats.attendedCount : null}
            reviews={stats && !activity?.hidden ? stats.reviewCount : null}
          />
        ) : null}
        <div className="flex gap-2">
          {isOwnProfile ? (
            <>
              {onEditProfile ? (
                <button type="button" onClick={onEditProfile} className={editProfileClass}>
                  Edit profile
                </button>
              ) : (
                <Link href="/?tab=mine&edit=1" className={editProfileClass}>
                  Edit profile
                </Link>
              )}
              <InviteFriendsButton variant="plain" className="flex-1" />
            </>
          ) : isAuthenticated ? (
            <>
              {followState ? (
                <FollowButton userId={userId} name={name} state={followState} />
              ) : null}
              <MessageUserButton
                otherUserId={userId as Id<"users">}
                className="flex-1 cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-50"
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/login?next=${encodeURIComponent(`/profile/${userId}`)}`,
                )
              }
              className="flex-1 cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
            >
              Message
            </button>
          )}
          <ShareProfileButton userId={userId} name={name} />
        </div>
      </div>

      <div className="grid grid-cols-1 overflow-hidden rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] sm:grid-cols-2">
        <div className="flex flex-col gap-2.5 p-4">
          <p className="text-sm font-bold">Wants to go</p>
          {wishlist.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {wishlist.slice(0, 6).map((c) => (
                <Link key={c} href={`/college/${collegeToSlug(c)}`} title={c}>
                  <CollegeCrest college={c} size={34} />
                </Link>
              ))}
              {wishlist.length > 6 ? (
                <span className="text-xs text-[var(--ink-muted)]">+{wishlist.length - 6}</span>
              ) : null}
            </div>
          ) : !isOwnProfile ? (
            <p className="text-xs text-[var(--ink-muted)]">Nothing yet.</p>
          ) : null}
          {isOwnProfile ? (
            <Link href="/?tab=mine&edit=1" className="text-xs font-bold text-[var(--accent)] hover:underline">
              {wishlist.length > 0 ? "Edit" : "Add colleges"}
            </Link>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setBadgeCaseOpen(true)}
          className="flex cursor-pointer flex-col gap-2.5 border-t-[1.5px] border-[color-mix(in_srgb,var(--ink)_10%,transparent)] p-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)] sm:border-l-[1.5px] sm:border-t-0"
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold">Badges</span>
            <span className="text-xs text-[var(--ink-muted)]">
              {earnedCount} of {TOTAL_BADGE_COUNT}
            </span>
          </span>
          {recentBadges.length > 0 ? (
            <span className="flex flex-wrap items-center gap-2">
              {recentBadges.map((def) => (
                <span key={def.id} title={def.name} className="flex">
                  <BadgeArt def={def} earned size={34} />
                </span>
              ))}
            </span>
          ) : (
            <span className="text-xs text-[var(--ink-muted)]">
              {isOwnProfile ? "Go to a formal to earn your first." : "None yet."}
            </span>
          )}
        </button>
      </div>



      {/* Activity stream */}
      <section aria-label="Activity">
        <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          Activity
        </h2>
        {activity === undefined ? (
          <SkeletonRows className="mt-3" count={2} />
        ) : activity.hidden && streamItems.length === 0 ? (
          <PrivateActivityNotice pending={followState?.following === "pending"} />
        ) : streamItems.length === 0 ? (
          <EmptyState
            className="mt-3"
            icon="calendar"
            title={isOwnProfile ? "No activity yet" : "Nothing here yet"}
            {...(isOwnProfile
              ? { action: { label: "List a formal", href: "/?tab=requests&openList=1" } }
              : {})}
          />
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
          <PrivateActivityNotice pending={followState?.following === "pending"} />
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
