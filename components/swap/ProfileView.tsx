"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ListingWithMenuPdfUrl } from "@/convex/listingHelpers";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Avatar, PRESET_AVATARS, PresetAvatarIcon, initialsFor } from "@/components/ui/Avatar";
import { ProfileIdCard } from "@/components/swap/ProfileIdCard";
import { SketchInstagram, SketchWhatsApp } from "@/components/ui/SketchSocial";
import { Modal } from "@/components/ui/Modal";
import { SketchCard } from "@/components/ui/SketchCard";
import { ListingDetailModal } from "@/components/swap/ListingDetailModal";
import { BlockingRequestModal } from "@/components/swap/BlockingRequestModal";
import { RequestPayModal } from "@/components/swap/RequestPayModal";
import { RequestSwapModal } from "@/components/swap/RequestSwapModal";
import { RequestTypeChooserModal } from "@/components/swap/RequestTypeChooserModal";
import { MessageUserButton } from "@/components/chat/MessageUserButton";
import { SwapConfirmedModal } from "@/components/swap/SwapConfirmedModal";
import { ProfileActivityStream } from "./ProfileActivityStream";
import { BadgeCaseModal } from "./BadgeCaseModal";
import { SettingsModal } from "@/components/SettingsModal";
import { DEFAULT_UI_FONT } from "@/convex/uiFont";
import type { AvatarSource } from "@/lib/auth/types";
import { listingSupportsSwap } from "@/lib/data/listingType";
import { findBlockingOutgoingRequestForTarget } from "@/lib/data/requestFilters";
import type { GroupSize, Listing, RequestType } from "@/lib/data/types";
import { cardRoleLabel, formatYearLabel } from "@/lib/data/format";
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
  /** Me tab already renders the editable card above this view. */
  omitCard?: boolean;
};

const STANDALONE_OUTER =
  "mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6";
const EMBEDDED_OUTER = "flex w-full flex-col gap-8";

export function ProfileView({
  userId,
  embedded = false,
  omitCard = false,
}: ProfileViewProps) {
  const router = useRouter();
  const { user: currentUser, isAuthenticated, signOut } = useAuth();
  const { getUser, listings, requests, sendRequest, getListing } = useData();
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [requestTarget, setRequestTarget] = useState<Listing | null>(null);
  const [pendingRequestType, setPendingRequestType] =
    useState<RequestType | null>(null);
  const [typeChooserTarget, setTypeChooserTarget] = useState<Listing | null>(
    null,
  );
  const [showNoListingPrompt, setShowNoListingPrompt] = useState(false);
  const [blockingRequestOpen, setBlockingRequestOpen] = useState(false);
  const [blockingHasAccepted, setBlockingHasAccepted] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    requestType: RequestType;
    mine: Listing | null;
    theirs: Listing | null;
    otherUserId: string | null;
  } | null>(null);
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

  const myActiveListings = useMemo(
    () =>
      currentUser
        ? listings.filter(
            (l) =>
              l.ownerUserId === currentUser.id &&
              l.status === "active" &&
              listingSupportsSwap(l.listingType),
          )
        : [],
    [listings, currentUser],
  );

  const openRequestFlow = useCallback(
    (listing: Listing, requestType: RequestType) => {
      if (currentUser) {
        const blocking = findBlockingOutgoingRequestForTarget(
          requests,
          currentUser.id,
          listing.id,
        );
        if (blocking) {
          setBlockingHasAccepted(blocking.status === "accepted");
          setBlockingRequestOpen(true);
          return;
        }
      }
      if (requestType === "swap" && myActiveListings.length === 0) {
        setShowNoListingPrompt(true);
        return;
      }
      setPendingRequestType(requestType);
      setRequestTarget(listing);
    },
    [currentUser, requests, myActiveListings.length],
  );

  const handleRequestClick = useCallback(
    (listing: Listing) => {
      if (!isAuthenticated) {
        router.push(
          `/login?next=${encodeURIComponent(`/profile/${userId}`)}`,
        );
        return;
      }
      if (listing.listingType === "both") {
        setTypeChooserTarget(listing);
        return;
      }
      if (listing.listingType === "pay") {
        openRequestFlow(listing, "pay");
        return;
      }
      openRequestFlow(listing, "swap");
    },
    [isAuthenticated, router, userId, openRequestFlow],
  );

  const handleRequestTypeChosen = useCallback(
    (requestType: RequestType) => {
      if (!typeChooserTarget) return;
      const target = typeChooserTarget;
      setTypeChooserTarget(null);
      openRequestFlow(target, requestType);
    },
    [typeChooserTarget, openRequestFlow],
  );

  const Outer = embedded ? "div" : "main";
  const outerClass = embedded ? EMBEDDED_OUTER : STANDALONE_OUTER;

  if (profile === undefined) {
    if (omitCard) {
      return (
        <Outer className={outerClass}>
          <p className="text-[var(--ink-muted)]">Loading activity…</p>
        </Outer>
      );
    }
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

  const rolePrint = cardRoleLabel(role);
  const yearPrint = formatYearLabel(year) || year;
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
    subject,
    uiFont: profileUser.uiFont ?? DEFAULT_UI_FONT,
    avatar,
  };

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

      {!isOwnProfile ? (
        <div className="flex items-center justify-end gap-3">
          {isAuthenticated ? (
            <MessageUserButton
              otherUserId={userId as Id<"users">}
              className="shrink-0 cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-50"
            />
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
      ) : null}

      {!omitCard && avatarOpen ? (
        <AvatarLightbox source={avatar} name={name} onClose={closeAvatar} />
      ) : null}

      {omitCard ? null : (
      <ProfileIdCard
        className="mx-auto"
        labelledBy="profile-card-name"
        photo={
          <button
            type="button"
            className="h-full w-full cursor-pointer"
            onClick={() => setAvatarOpen(true)}
            aria-label={`View ${name}'s photo`}
          >
            <Avatar
              name={name}
              size="fill"
              source={avatar}
              square
              className="border-0 bg-[#cfcbc2] text-[#3a3a3a]"
            />
          </button>
        }
        name={
          <h1 id="profile-card-name" className="m-0 truncate">
            {name}
          </h1>
        }
        status={
          rolePrint || subject ? (
            <p className="m-0">
              {rolePrint ? (
                <span className="font-semibold tracking-wide">{rolePrint}</span>
              ) : null}
              {rolePrint && subject ? " reading for " : null}
              {subject}
            </p>
          ) : (
            <p className="m-0 text-black/35">—</p>
          )
        }
        college={
          college ? (
            <p className="m-0 truncate">{college}</p>
          ) : (
            <p className="m-0 text-black/35">College</p>
          )
        }
        extras={
          instagramHandle ||
          whatsappPhone ||
          dietaryRequirements ||
          interests.length > 0 ? (
            <div className="flex flex-col gap-[0.12em]">
              {instagramHandle ? (
                <a
                  href={`https://instagram.com/${instagramHandle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-[0.4em] text-inherit underline-offset-2 hover:underline"
                >
                  <SketchInstagram className="h-[1.05em] w-[1.05em]" />
                  <span className="truncate">@{instagramHandle}</span>
                </a>
              ) : null}
              {whatsappPhone ? (
                <a
                  href={`https://wa.me/${whatsappPhone.replace(/[^\d+]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-[0.4em] text-inherit underline-offset-2 hover:underline"
                >
                  <SketchWhatsApp className="h-[1.05em] w-[1.05em]" />
                  <span className="truncate">{whatsappPhone}</span>
                </a>
              ) : null}
              {dietaryRequirements ? (
                <p className="m-0 truncate">
                  <span className="text-[#161616]/55">Dietary requirements </span>
                  {dietaryRequirements}
                </p>
              ) : null}
              {interests.length > 0 ? (
                <p className="m-0 truncate">{interests.join(" · ")}</p>
              ) : null}
            </div>
          ) : undefined
        }
        validUntil={
          yearPrint ? (
            <span className="uppercase">{yearPrint}</span>
          ) : (
            <span className="text-black/35">—</span>
          )
        }
        earnedBadges={earnedBadges}
        onOpenBadges={() => setBadgeCaseOpen(true)}
      />
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
          <span className="font-extrabold">{stats ? stats.reviewCount : "–"}</span>{" "}
          <span className="text-[0.75rem] uppercase tracking-[0.05em] text-[var(--ink-muted)]">
            reviews
          </span>
        </span>
        <span className="text-[1.05rem]">
          <span className="font-extrabold">{stats ? stats.attendedCount : "–"}</span>{" "}
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
        ) : streamItems.length === 0 ? (
          <div className="mt-3 rounded-[18px] border-[1.5px] border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] px-5 py-8 text-center text-[var(--ink-muted)]">
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
      </section>

      {isOwnProfile ? (
        <div className="flex flex-wrap justify-center gap-3 border-t-[2px] border-[var(--ink)]/10 pt-8">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-6 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => {
              void signOut().then(() => router.push("/"));
            }}
            className="cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-6 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            Sign out
          </button>
        </div>
      ) : null}

      {isOwnProfile ? (
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}

      {!omitCard ? (
      <BadgeCaseModal
        open={badgeCaseOpen}
        onClose={() => setBadgeCaseOpen(false)}
        earned={earnedBadges}
      />
      ) : null}

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
        hideInterests
        disabledLabel={
          isOwnProfile
            ? "Your listing"
            : !isAuthenticated
              ? "Sign in to request"
              : undefined
        }
      />

      <RequestTypeChooserModal
        open={!!typeChooserTarget}
        onClose={() => setTypeChooserTarget(null)}
        college={typeChooserTarget?.college ?? ""}
        onChoose={handleRequestTypeChosen}
      />

      <RequestSwapModal
        open={!!requestTarget && pendingRequestType === "swap"}
        onClose={() => {
          setRequestTarget(null);
          setPendingRequestType(null);
        }}
        targetListing={requestTarget}
        myListings={myActiveListings}
        onSubmit={async ({ offeringListingId, message }) => {
          if (!requestTarget) return;
          const result = await sendRequest({
            requestType: "swap",
            targetListingId: requestTarget.id,
            offeringListingId,
            message,
            targetOwnerUserId: requestTarget.ownerUserId,
          });
          if (!result) throw new Error("Could not send request.");
          setRequestTarget(null);
          setPendingRequestType(null);
          if (result.status === "accepted") {
            setConfirmed({
              requestType: "swap",
              mine: getListing(offeringListingId) ?? null,
              theirs:
                getListing(requestTarget.id) ?? requestTarget,
              otherUserId: requestTarget.ownerUserId,
            });
          }
        }}
      />

      <RequestPayModal
        open={!!requestTarget && pendingRequestType === "pay"}
        onClose={() => {
          setRequestTarget(null);
          setPendingRequestType(null);
        }}
        targetListing={requestTarget}
        onSubmit={async ({ message }) => {
          if (!requestTarget) return;
          const result = await sendRequest({
            requestType: "pay",
            targetListingId: requestTarget.id,
            message,
            targetOwnerUserId: requestTarget.ownerUserId,
          });
          if (!result) throw new Error("Could not send request.");
          setRequestTarget(null);
          setPendingRequestType(null);
          if (result.status === "accepted") {
            setConfirmed({
              requestType: "pay",
              mine: null,
              theirs:
                getListing(requestTarget.id) ?? requestTarget,
              otherUserId: requestTarget.ownerUserId,
            });
          }
        }}
      />

      <SwapConfirmedModal
        open={!!confirmed}
        onClose={() => setConfirmed(null)}
        requestType={confirmed?.requestType ?? "swap"}
        myListing={confirmed?.mine ?? null}
        theirListing={confirmed?.theirs ?? null}
        otherUser={
          confirmed?.otherUserId ? (getUser(confirmed.otherUserId) ?? null) : null
        }
        otherUserId={confirmed?.otherUserId ?? null}
      />

      <BlockingRequestModal
        open={blockingRequestOpen}
        onClose={() => setBlockingRequestOpen(false)}
        hasAccepted={blockingHasAccepted}
        onViewRequests={() => router.push("/?tab=requests")}
      />

      <Modal
        open={showNoListingPrompt}
        onClose={() => setShowNoListingPrompt(false)}
        title="List your formal first"
        panelClassName="max-w-sm"
      >
        <p className="mb-6 text-sm leading-relaxed text-[var(--ink-muted)]">
          You need an active swap listing before you can request a swap.
          Pay-only listings cannot be used in swaps.
        </p>
        <Link
          href="/?tab=requests&openList=1"
          className="flex w-full cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] px-8 py-3 text-sm text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
          onClick={() => setShowNoListingPrompt(false)}
        >
          + List my formal
        </Link>
      </Modal>
    </Outer>
  );
}
